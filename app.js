/*
 * Mes papiers — interface.
 * Étape 2 : chaque papier a une catégorie, un organisme et une date limite
 * facultative, et tout est enregistré sur l'appareil (voir store.js).
 */
(function () {
  'use strict';

  const THUMBNAIL_MAX_SIDE = 320; // pixels, plus grand côté de la vignette
  const PHOTO_MAX_SIDE = 2400;    // pixels, plus grand côté d'une photo enregistrée

  // Catégories fixes. L'identifiant est ce qui est enregistré.
  const CATEGORIES = [
    { id: 'impots', label: 'Impôts' },
    { id: 'sante', label: 'Santé' },
    { id: 'logement', label: 'Logement' },
    { id: 'banque', label: 'Banque' },
    { id: 'energie', label: 'Énergie' },
    { id: 'autre', label: 'Autre' },
  ];

  const $ = (id) => document.getElementById(id);

  const els = {
    count: $('count'),
    storageError: $('storage-error'),
    empty: $('empty'),
    list: $('list'),
    addButton: $('add-button'),
    dialog: $('paper-dialog'),
    dialogTitle: $('paper-dialog-title'),
    stepChoose: $('step-choose'),
    cameraInput: $('camera-input'),
    fileInput: $('file-input'),
    form: $('paper-form'),
    previewOpen: $('preview-open'),
    previewImage: $('preview-image'),
    previewFile: $('preview-file'),
    previewFileLabel: $('preview-file-label'),
    previewCaption: $('preview-caption'),
    changeButton: $('change-button'),
    categoryChips: $('category-chips'),
    categoryError: $('category-error'),
    organisation: $('organisation'),
    organisationList: $('organisation-list'),
    organisationError: $('organisation-error'),
    dueDate: $('due-date'),
    dueDateError: $('due-date-error'),
    saveButton: $('save-button'),
    deleteZone: $('delete-zone'),
    deleteButton: $('delete-button'),
    deleteConfirm: $('delete-confirm'),
    deleteCancel: $('delete-cancel'),
    deleteYes: $('delete-yes'),
    sheetError: $('sheet-error'),
    viewer: $('viewer'),
    viewerTitle: $('viewer-title'),
    viewerImage: $('viewer-image'),
  };

  let papers = [];                  // fiches affichées, la plus récente d'abord
  // Feuille ouverte : { mode: 'add', file, fileUrl } pour un nouveau papier,
  // { mode: 'edit', paper, fileUrl } pour un papier existant, sinon null.
  let sheet = null;
  let busy = false;
  const thumbnailUrls = new Map();  // id du papier -> URL de sa vignette

  /* ---------- Mise en forme ---------- */

  const formats = {
    added: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    dueThisYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }),
    dueOtherYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  function formatSize(bytes) {
    const number = (value, digits) =>
      value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
    if (bytes < 1024) return number(bytes, 0) + ' octets';
    if (bytes < 1024 * 1024) return number(bytes / 1024, 0) + ' Ko';
    return number(bytes / (1024 * 1024), 1) + ' Mo';
  }

  // Une date limite est enregistrée sous la forme « AAAA-MM-JJ », sans heure
  // ni fuseau : c'est un jour du calendrier. Renvoie null si elle est invalide.
  function parseDay(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year, month - 1, day);
    const exists =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return exists ? date : null;
  }

  function formatDueDate(value) {
    const date = parseDay(value);
    if (!date) return '';
    const thisYear = date.getFullYear() === new Date().getFullYear();
    return (thisYear ? formats.dueThisYear : formats.dueOtherYear).format(date);
  }

  function isImage(type) {
    return typeof type === 'string' && type.startsWith('image/');
  }

  function kindLabel(type) {
    if (isImage(type)) return 'Image';
    if (type === 'application/pdf') return 'PDF';
    return 'Fichier';
  }

  function categoryLabel(id) {
    const category = CATEGORIES.find((candidate) => candidate.id === id);
    return category ? category.label : 'Autre';
  }

  function newId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- Préparation du fichier avant enregistrement ---------- */

  function drawJpeg(image, maxSide, quality) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; // fond blanc pour les images transparentes
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  }

  function withJpgExtension(name) {
    if (!name) return 'photo.jpg';
    return /\.jpe?g$/i.test(name) ? name : name.replace(/\.[^.]*$/, '') + '.jpg';
  }

  // Renvoie ce qui sera enregistré : { blob, type, fileName, thumbnail }.
  //  - Une vignette est fabriquée pour la liste.
  //  - Les photos très grandes sont ramenées à 2400 px : un courrier reste
  //    lisible, et il pèse plusieurs fois moins lourd.
  //  - Tout le reste (PDF, petites images, formats illisibles) est gardé tel quel.
  async function prepareFile(file) {
    const prepared = {
      blob: file,
      type: file.type || '',
      fileName: file.name || '',
      thumbnail: null,
    };
    if (!isImage(file.type)) return prepared;

    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) return prepared;

      prepared.thumbnail = await drawJpeg(image, THUMBNAIL_MAX_SIDE, 0.8);

      if (Math.max(image.naturalWidth, image.naturalHeight) > PHOTO_MAX_SIDE) {
        const reduced = await drawJpeg(image, PHOTO_MAX_SIDE, 0.85);
        if (reduced && reduced.size < file.size) {
          prepared.blob = reduced;
          prepared.type = 'image/jpeg';
          prepared.fileName = withJpgExtension(file.name);
        }
      }
    } catch (error) {
      // Image que le navigateur ne sait pas lire : on l'enregistre telle quelle.
    } finally {
      URL.revokeObjectURL(url);
    }
    return prepared;
  }

  /* ---------- Liste ---------- */

  function thumbnailUrl(paper) {
    if (!paper.thumbnail) return null;
    if (!thumbnailUrls.has(paper.id)) {
      thumbnailUrls.set(paper.id, URL.createObjectURL(paper.thumbnail));
    }
    return thumbnailUrls.get(paper.id);
  }

  function categoryTag(id) {
    const tag = el('span', 'tag');
    tag.dataset.category = id;
    tag.append(el('span', 'dot'), categoryLabel(id));
    return tag;
  }

  function renderPaper(paper) {
    const item = el('li');
    const button = el('button', 'paper');
    button.type = 'button';
    button.dataset.id = paper.id;

    const thumb = el('span', 'thumb');
    const url = thumbnailUrl(paper);
    if (url) {
      const image = el('img');
      image.src = url;
      image.alt = '';
      thumb.append(image);
    } else {
      thumb.append(el('span', 'thumb-label', kindLabel(paper.type).toUpperCase()));
    }

    const meta = el('span', 'paper-meta');
    meta.append(categoryTag(paper.category));
    const due = formatDueDate(paper.dueDate);
    if (due) meta.append(el('span', 'paper-due', 'Date limite : ' + due));

    const text = el('span', 'paper-text');
    text.append(el('span', 'paper-title', paper.organisation), meta);

    const chevron = el('span', 'paper-chevron', '›');
    chevron.setAttribute('aria-hidden', 'true');

    button.append(thumb, text, chevron);
    item.append(button);
    return item;
  }

  function render() {
    const total = papers.length;
    els.empty.hidden = total > 0;
    els.list.hidden = total === 0;
    els.count.textContent = total === 0 ? '' : total === 1 ? '1 papier' : total + ' papiers';
    els.list.replaceChildren(...papers.map(renderPaper));

    // Les organismes déjà saisis sont proposés pendant la frappe.
    const names = [...new Set(papers.map((paper) => paper.organisation))].sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
    els.organisationList.replaceChildren(
      ...names.map((name) => {
        const option = el('option');
        option.value = name;
        return option;
      })
    );
  }

  async function refresh() {
    const all = await PaperStore.list();
    // Le plus récent d'abord. Le tri par échéance arrive à l'étape 3.
    papers = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // On libère les vignettes des papiers supprimés.
    const ids = new Set(papers.map((paper) => paper.id));
    for (const [id, url] of thumbnailUrls) {
      if (!ids.has(id)) {
        URL.revokeObjectURL(url);
        thumbnailUrls.delete(id);
      }
    }
    render();
  }

  /* ---------- Feuille d'un papier : aperçu ---------- */

  function showSheetError(message) {
    els.sheetError.textContent = message;
    els.sheetError.hidden = false;
  }

  function clearErrors() {
    els.sheetError.hidden = true;
    setFieldError(els.categoryError, null, false);
    setFieldError(els.organisationError, els.organisation, false);
    setFieldError(els.dueDateError, els.dueDate, false);
  }

  function setFieldError(message, input, invalid) {
    message.hidden = !invalid;
    if (input) {
      if (invalid) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }

  function releaseFileUrl() {
    if (sheet && sheet.fileUrl) URL.revokeObjectURL(sheet.fileUrl);
    if (sheet) sheet.fileUrl = null;
    els.previewImage.removeAttribute('src');
    els.previewFile.removeAttribute('href');
  }

  // Affiche le fichier en tête de feuille : un bandeau pour une image (toucher
  // pour agrandir), un lien pour les autres fichiers.
  function showPreview(type, imageUrl, canEnlarge) {
    const asImage = isImage(type) && Boolean(imageUrl);
    els.previewOpen.hidden = !asImage;
    els.previewFile.hidden = asImage;
    if (asImage) {
      els.previewImage.src = imageUrl;
      els.previewOpen.disabled = !canEnlarge;
    } else {
      els.previewFileLabel.textContent =
        type === 'application/pdf' ? 'Ouvrir le PDF' : 'Ouvrir le fichier';
      if (sheet && sheet.fileUrl) els.previewFile.href = sheet.fileUrl;
    }
  }

  /* ---------- Feuille d'un papier : ouverture ---------- */

  function resetForm() {
    els.form.reset();
    clearErrors();
    els.deleteConfirm.hidden = true;
    els.deleteButton.hidden = false;
    setBusy(false);
  }

  function showStep(step) {
    els.stepChoose.hidden = step !== 'choose';
    els.form.hidden = step !== 'form';
  }

  function openAdd() {
    sheet = { mode: 'add', file: null, fileUrl: null };
    resetForm();
    els.dialogTitle.textContent = 'Nouveau papier';
    els.saveButton.textContent = 'Ajouter';
    els.changeButton.hidden = false;
    els.deleteZone.hidden = true;
    showStep('choose');
    els.dialog.showModal();
  }

  function onFilePicked(file) {
    if (!sheet || sheet.mode !== 'add') return;
    els.sheetError.hidden = true;
    if (file.size === 0) {
      showSheetError('Ce fichier est vide. En choisir un autre.');
      return;
    }
    releaseFileUrl();
    sheet.file = file;
    sheet.fileUrl = URL.createObjectURL(file);
    els.previewCaption.textContent = kindLabel(file.type) + ' · ' + formatSize(file.size);
    showPreview(file.type, sheet.fileUrl, true);
    showStep('form');
  }

  async function openEdit(paper) {
    const current = { mode: 'edit', paper, fileUrl: null };
    sheet = current;
    resetForm();
    els.dialogTitle.textContent = 'Détails du papier';
    els.saveButton.textContent = 'Enregistrer';
    els.changeButton.hidden = true;
    els.deleteZone.hidden = false;

    const radio = els.categoryChips.querySelector('input[value="' + paper.category + '"]');
    if (radio) radio.checked = true;
    els.organisation.value = paper.organisation;
    els.dueDate.value = paper.dueDate || '';
    els.previewCaption.textContent =
      kindLabel(paper.type) +
      ' · ' +
      formatSize(paper.size) +
      ' · ajouté le ' +
      formats.added.format(new Date(paper.createdAt));

    // En attendant le fichier, on montre la vignette.
    showPreview(paper.type, thumbnailUrl(paper), false);
    showStep('form');
    els.dialog.showModal();

    try {
      const file = await PaperStore.getFile(paper.id);
      if (sheet !== current) return; // la feuille a été refermée entre-temps
      if (!file) throw new Error('Fichier introuvable');
      current.fileUrl = URL.createObjectURL(file);
      showPreview(paper.type, current.fileUrl, true);
    } catch (error) {
      console.error(error);
      if (sheet === current) showSheetError("Le fichier de ce papier n'a pas pu être relu.");
    }
  }

  /* ---------- Feuille d'un papier : enregistrement ---------- */

  function setBusy(value) {
    busy = value;
    els.saveButton.disabled = value;
    els.deleteYes.disabled = value;
  }

  // Lit et vérifie les trois champs. Renvoie null si l'un d'eux est à corriger.
  function readFields() {
    const checked = els.categoryChips.querySelector('input:checked');
    const organisation = els.organisation.value.trim().replace(/\s+/g, ' ');
    const dueValue = els.dueDate.value;
    // Une date à moitié saisie donne une valeur vide mais « badInput ».
    const dueIncomplete =
      (els.dueDate.validity && els.dueDate.validity.badInput) ||
      (dueValue !== '' && !parseDay(dueValue));

    setFieldError(els.categoryError, null, !checked);
    setFieldError(els.organisationError, els.organisation, !organisation);
    setFieldError(els.dueDateError, els.dueDate, dueIncomplete);

    if (!checked) {
      els.categoryChips.querySelector('input').focus();
      return null;
    }
    if (!organisation) {
      els.organisation.focus();
      return null;
    }
    if (dueIncomplete) {
      els.dueDate.focus();
      return null;
    }
    return { category: checked.value, organisation, dueDate: dueValue || null };
  }

  function saveErrorMessage(error) {
    if (error && error.name === 'QuotaExceededError') {
      return "Il n'y a plus assez de place sur cet appareil pour enregistrer ce papier.";
    }
    return "L'enregistrement a échoué. Réessayer.";
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!sheet || busy) return;
    els.sheetError.hidden = true;
    const fields = readFields();
    if (!fields) return;

    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (sheet.mode === 'add') {
        const prepared = await prepareFile(sheet.file);
        await PaperStore.add(
          Object.assign(fields, {
            id: newId(),
            done: false,                // servira au bouton « traité » (étape 3)
            fileName: prepared.fileName,
            type: prepared.type,
            size: prepared.blob.size,
            thumbnail: prepared.thumbnail,
            createdAt: now,
            updatedAt: now,
          }),
          prepared.blob
        );
        PaperStore.requestPersistence();
        window.scrollTo(0, 0); // le nouveau papier arrive en haut de la liste
      } else {
        await PaperStore.update(sheet.paper.id, Object.assign(fields, { updatedAt: now }));
      }
      els.dialog.close();
      await refresh();
    } catch (error) {
      console.error(error);
      showSheetError(saveErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!sheet || sheet.mode !== 'edit' || busy) return;
    setBusy(true);
    try {
      await PaperStore.remove(sheet.paper.id);
      els.dialog.close();
      await refresh();
    } catch (error) {
      console.error(error);
      showSheetError('La suppression a échoué. Réessayer.');
    } finally {
      setBusy(false);
    }
  }

  function showDeleteConfirm(visible) {
    els.deleteConfirm.hidden = !visible;
    els.deleteButton.hidden = visible;
    if (visible) {
      els.deleteCancel.focus();
      els.deleteConfirm.scrollIntoView({ block: 'nearest' });
    }
  }

  /* ---------- Visionneuse ---------- */

  function openViewer() {
    if (!sheet || !sheet.fileUrl) return;
    const title = els.organisation.value.trim() || els.dialogTitle.textContent;
    els.viewerImage.src = sheet.fileUrl;
    els.viewerImage.alt = title;
    els.viewerTitle.textContent = title;
    els.viewer.showModal();
  }

  /* ---------- Branchements ---------- */

  function buildCategoryChips() {
    els.categoryChips.replaceChildren(
      ...CATEGORIES.map((category) => {
        const label = el('label', 'chip');
        label.dataset.category = category.id;
        const input = el('input', 'visually-hidden');
        input.type = 'radio';
        input.name = 'category';
        input.value = category.id;
        label.append(input, el('span', 'dot'), category.label);
        return label;
      })
    );
  }

  function watchInput(input) {
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      // On vide le champ pour pouvoir rechoisir le même fichier ensuite.
      input.value = '';
      if (file) onFilePicked(file);
    });
  }

  buildCategoryChips();

  els.addButton.addEventListener('click', openAdd);
  watchInput(els.cameraInput);
  watchInput(els.fileInput);
  els.changeButton.addEventListener('click', () => {
    els.sheetError.hidden = true;
    showStep('choose'); // les champs déjà remplis sont conservés
  });

  els.form.addEventListener('submit', onSubmit);
  els.categoryChips.addEventListener('change', () => setFieldError(els.categoryError, null, false));
  els.organisation.addEventListener('input', () =>
    setFieldError(els.organisationError, els.organisation, false)
  );
  els.dueDate.addEventListener('input', () => setFieldError(els.dueDateError, els.dueDate, false));

  els.deleteButton.addEventListener('click', () => showDeleteConfirm(true));
  els.deleteCancel.addEventListener('click', () => showDeleteConfirm(false));
  els.deleteYes.addEventListener('click', onDelete);

  els.previewOpen.addEventListener('click', openViewer);
  // Image que le navigateur ne sait pas afficher : on propose de l'ouvrir.
  els.previewImage.addEventListener('error', () => showPreview('', null, false));

  els.dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) {
      els.dialog.close();
      return;
    }
    // Toucher le fond assombri referme la feuille, sauf pendant la saisie :
    // un geste maladroit ne doit pas faire perdre ce qui vient d'être tapé.
    if (event.target === els.dialog && els.form.hidden) els.dialog.close();
  });
  els.dialog.addEventListener('close', () => {
    releaseFileUrl();
    sheet = null;
  });

  els.viewer.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) els.viewer.close();
  });
  els.viewer.addEventListener('close', () => els.viewerImage.removeAttribute('src'));

  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('.paper');
    if (!button) return;
    const paper = papers.find((candidate) => candidate.id === button.dataset.id);
    if (paper) openEdit(paper);
  });

  refresh().catch((error) => {
    console.error(error);
    els.storageError.hidden = false;
  });
})();
