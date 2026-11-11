/*
 * Mes papiers — interface.
 * Étape 3 : la liste est triée par échéance la plus proche, se filtre par
 * catégorie, se fouille par mot, et chaque papier peut être marqué « traité ».
 * Les données sont enregistrées sur l'appareil (voir store.js).
 */
(function () {
  'use strict';

  const THUMBNAIL_MAX_SIDE = 320; // pixels, plus grand côté de la vignette
  const PHOTO_MAX_SIDE = 2400;    // pixels, plus grand côté d'une photo enregistrée
  const SOON_DAYS = 7;            // une échéance est « proche » à partir de 7 jours
  const TOAST_DELAY = 6000;       // millisecondes

  // Catégories fixes. L'identifiant est ce qui est enregistré.
  const CATEGORIES = [
    { id: 'impots', label: 'Impôts' },
    { id: 'sante', label: 'Santé' },
    { id: 'logement', label: 'Logement' },
    { id: 'banque', label: 'Banque' },
    { id: 'energie', label: 'Énergie' },
    { id: 'autre', label: 'Autre' },
  ];

  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const $ = (id) => document.getElementById(id);

  const els = {
    main: document.querySelector('.app-main'),
    count: $('count'),
    storageError: $('storage-error'),
    empty: $('empty'),
    toolbar: $('toolbar'),
    search: $('search'),
    searchClear: $('search-clear'),
    filters: $('filters'),
    noResult: $('no-result'),
    resetView: $('reset-view'),
    todoSection: $('todo-section'),
    todoTitle: $('todo-title'),
    todoCount: $('todo-count'),
    todoList: $('todo-list'),
    doneSection: $('done-section'),
    doneCount: $('done-count'),
    doneList: $('done-list'),
    addButton: $('add-button'),
    toast: $('toast'),
    toastText: $('toast-text'),
    toastUndo: $('toast-undo'),
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
    doneStatus: $('done-status'),
    categoryChips: $('category-chips'),
    categoryError: $('category-error'),
    organisation: $('organisation'),
    organisationList: $('organisation-list'),
    organisationError: $('organisation-error'),
    dueDate: $('due-date'),
    dueDateError: $('due-date-error'),
    saveButton: $('save-button'),
    doneToggle: $('done-toggle'),
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

  let papers = [];                    // toutes les fiches
  const view = { query: '', category: 'all' }; // recherche et filtre en cours
  // Feuille ouverte : { mode: 'add', file, fileUrl } pour un nouveau papier,
  // { mode: 'edit', paper, fileUrl } pour un papier existant, sinon null.
  let sheet = null;
  let busy = false;
  let filtersShown = '';              // catégories actuellement proposées dans le filtre
  let toastTimer = null;
  let toastUndo = null;
  const thumbnailUrls = new Map();    // id du papier -> URL de sa vignette
  const searchTexts = new Map();      // id du papier -> texte dans lequel on cherche

  /* ---------- Mise en forme ---------- */

  const formats = {
    long: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
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

  function formatDueDate(date) {
    const thisYear = date.getFullYear() === new Date().getFullYear();
    return (thisYear ? formats.dueThisYear : formats.dueOtherYear).format(date);
  }

  // Nombre de jours entre aujourd'hui et `date` : négatif si elle est passée.
  function daysFromToday(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((date - today) / 86400000);
  }

  // Ce qu'on affiche pour l'échéance d'un papier : { text, level }, où level
  // vaut 'late' (dépassée), 'soon' (dans la semaine) ou '' (rien de pressant).
  function dueInfo(paper) {
    const date = parseDay(paper.dueDate);
    if (!date) return null;
    const day = formatDueDate(date);
    if (paper.done) return { text: 'Date limite : ' + day, level: '' };
    const days = daysFromToday(date);
    if (days < 0) return { text: 'En retard · ' + day, level: 'late' };
    if (days === 0) return { text: "Aujourd'hui", level: 'soon' };
    if (days === 1) return { text: 'Demain · ' + day, level: 'soon' };
    if (days <= SOON_DAYS) return { text: 'Dans ' + days + ' jours · ' + day, level: 'soon' };
    return { text: 'Date limite : ' + day, level: '' };
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

  /* ---------- Recherche, filtre et tri ---------- */

  // Minuscules et sans accents : « impots » trouve « Impôts ».
  function normalize(text) {
    return String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  // Tout ce dans quoi un mot peut être cherché : l'organisme, la catégorie,
  // le nom du fichier et la date limite en toutes lettres.
  function buildSearchText(paper) {
    const date = parseDay(paper.dueDate);
    return normalize(
      [
        paper.organisation,
        categoryLabel(paper.category),
        paper.fileName,
        date ? formats.long.format(date) : '',
      ].join(' ')
    );
  }

  function matchesView(paper) {
    if (view.category !== 'all' && paper.category !== view.category) return false;
    const words = normalize(view.query).split(/\s+/).filter(Boolean);
    const text = searchTexts.get(paper.id) || '';
    return words.every((word) => text.includes(word));
  }

  // À traiter : l'échéance la plus proche d'abord (les retards sont donc en
  // tête), puis les papiers sans date, du plus récent au plus ancien.
  function compareTodo(a, b) {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate) || b.createdAt.localeCompare(a.createdAt);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  }

  // Traités : le dernier traité d'abord.
  function compareDone(a, b) {
    const when = (paper) => paper.doneAt || paper.updatedAt || paper.createdAt;
    return when(b).localeCompare(when(a));
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

  // Une ligne de la liste : une grande zone qui ouvre le papier, et à droite
  // le rond « traité ».
  function renderPaper(paper) {
    const item = el('li', 'paper' + (paper.done ? ' is-done' : ''));
    item.dataset.id = paper.id;

    const open = el('button', 'paper-open');
    open.type = 'button';

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
    const due = dueInfo(paper);
    if (due) {
      const label = el('span', 'paper-due', due.text);
      if (due.level) label.dataset.level = due.level;
      meta.append(label);
    }

    const text = el('span', 'paper-text');
    text.append(el('span', 'paper-title', paper.organisation), meta);
    open.append(thumb, text);

    const done = el('button', 'paper-done');
    done.type = 'button';
    done.setAttribute('aria-pressed', String(Boolean(paper.done)));
    const action = paper.done ? 'Remettre à traiter' : 'Marquer comme traité';
    done.setAttribute('aria-label', action + ' : ' + paper.organisation);
    done.title = action;
    const check = el('span', 'check');
    check.innerHTML = CHECK_ICON;
    done.append(check);

    item.append(open, done);
    return item;
  }

  // Le filtre ne propose que les catégories réellement utilisées, et
  // seulement s'il y en a au moins deux à départager.
  function renderFilters() {
    const used = CATEGORIES.filter((category) =>
      papers.some((paper) => paper.category === category.id)
    );
    if (view.category !== 'all' && !used.some((category) => category.id === view.category)) {
      view.category = 'all';
    }
    els.filters.hidden = used.length < 2;

    // On ne reconstruit les boutons que si la liste des catégories change,
    // pour ne pas faire perdre sa place à quelqu'un qui navigue au clavier.
    const key = used.map((category) => category.id).join(',');
    if (key !== filtersShown) {
      filtersShown = key;
      const all = el('button', 'filter', 'Toutes');
      all.type = 'button';
      all.dataset.filter = 'all';
      els.filters.replaceChildren(
        all,
        ...used.map((category) => {
          const button = el('button', 'filter');
          button.type = 'button';
          button.dataset.filter = category.id;
          button.dataset.category = category.id;
          button.append(el('span', 'dot'), category.label);
          return button;
        })
      );
    }
    for (const button of els.filters.children) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === view.category));
    }
  }

  function render() {
    const total = papers.length;
    const pending = papers.filter((paper) => !paper.done).length;

    els.empty.hidden = total > 0;
    els.toolbar.hidden = total === 0;
    els.count.textContent =
      total === 0 ? '' : pending === 0 ? 'Tout est traité' : pending + ' à traiter';
    els.searchClear.hidden = els.search.value === '';
    renderFilters();

    const visible = papers.filter(matchesView);
    const todo = visible.filter((paper) => !paper.done).sort(compareTodo);
    const done = visible.filter((paper) => paper.done).sort(compareDone);

    els.todoSection.hidden = todo.length === 0;
    els.doneSection.hidden = done.length === 0;
    // Tant qu'aucun papier n'est traité, l'intertitre « À traiter » est inutile.
    els.todoTitle.hidden = pending === total;
    els.todoCount.textContent = todo.length;
    els.doneCount.textContent = done.length;
    els.todoList.replaceChildren(...todo.map(renderPaper));
    els.doneList.replaceChildren(...done.map(renderPaper));
    els.noResult.hidden = total === 0 || visible.length > 0;

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
    papers = await PaperStore.list();

    searchTexts.clear();
    for (const paper of papers) searchTexts.set(paper.id, buildSearchText(paper));

    // On libère les vignettes des papiers supprimés.
    for (const [id, url] of thumbnailUrls) {
      if (!searchTexts.has(id)) {
        URL.revokeObjectURL(url);
        thumbnailUrls.delete(id);
      }
    }
    render();
  }

  function resetView() {
    view.query = '';
    view.category = 'all';
    els.search.value = '';
    render();
  }

  function findRow(id) {
    return [...els.main.querySelectorAll('.paper')].find((row) => row.dataset.id === id) || null;
  }

  // Amène à l'écran le papier qu'on vient d'ajouter ou de modifier, quitte à
  // lever la recherche et le filtre s'ils le cachent, et le signale un instant.
  function reveal(id) {
    const paper = papers.find((candidate) => candidate.id === id);
    if (!paper) return;
    if (!matchesView(paper)) resetView();
    const row = findRow(id);
    if (!row) return;
    row.scrollIntoView({ block: 'center' });
    row.classList.add('is-fresh');
  }

  /* ---------- Message bref ---------- */

  function hideToast() {
    clearTimeout(toastTimer);
    els.toast.hidden = true;
    toastUndo = null;
  }

  function showToast(message, undo) {
    els.toastText.textContent = message;
    els.toastUndo.hidden = !undo;
    toastUndo = undo || null;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, TOAST_DELAY);
  }

  /* ---------- Traité / à traiter ---------- */

  // Enregistre l'état « traité » d'un papier, avec d'éventuels autres champs.
  // `announce` affiche un message qui permet d'annuler.
  async function saveDone(paper, done, extraFields, announce) {
    const now = new Date().toISOString();
    await PaperStore.update(
      paper.id,
      Object.assign({}, extraFields, { done, doneAt: done ? now : null, updatedAt: now })
    );
    await refresh();
    if (!announce) {
      hideToast();
      return;
    }
    const name = '« ' + (extraFields ? extraFields.organisation : paper.organisation) + ' »';
    showToast(done ? name + ' est traité.' : name + ' est remis à traiter.', () =>
      saveDone(paper, !done, null, false).catch(reportDoneError)
    );
  }

  function reportDoneError(error) {
    console.error(error);
    showToast("Le changement n'a pas pu être enregistré.", null);
  }

  async function toggleDoneFromList(paper) {
    try {
      await saveDone(paper, !paper.done, null, true);
      // Le rond a changé de place avec sa ligne : on lui rend le focus.
      const row = findRow(paper.id);
      if (row && document.activeElement === document.body) {
        row.querySelector('.paper-done').focus({ preventScroll: true });
      }
    } catch (error) {
      reportDoneError(error);
    }
  }

  /* ---------- Feuille d'un papier : aperçu ---------- */

  function showSheetError(message) {
    els.sheetError.textContent = message;
    els.sheetError.hidden = false;
  }

  function setFieldError(message, input, invalid) {
    message.hidden = !invalid;
    if (input) {
      if (invalid) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }

  function clearErrors() {
    els.sheetError.hidden = true;
    setFieldError(els.categoryError, null, false);
    setFieldError(els.organisationError, els.organisation, false);
    setFieldError(els.dueDateError, els.dueDate, false);
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
    els.doneStatus.hidden = true;
    els.doneToggle.hidden = true;
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

    els.doneToggle.hidden = false;
    els.doneToggle.textContent = paper.done ? 'Remettre à traiter' : 'Marquer comme traité';
    els.doneStatus.hidden = !paper.done;
    els.doneStatus.textContent = paper.doneAt
      ? 'Traité le ' + formats.long.format(new Date(paper.doneAt))
      : 'Traité';

    const radio = els.categoryChips.querySelector('input[value="' + paper.category + '"]');
    if (radio) radio.checked = true;
    els.organisation.value = paper.organisation;
    els.dueDate.value = paper.dueDate || '';
    els.previewCaption.textContent =
      kindLabel(paper.type) +
      ' · ' +
      formatSize(paper.size) +
      ' · ajouté le ' +
      formats.long.format(new Date(paper.createdAt));

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
    els.doneToggle.disabled = value;
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
      let id;
      if (sheet.mode === 'add') {
        id = newId();
        const prepared = await prepareFile(sheet.file);
        await PaperStore.add(
          Object.assign(fields, {
            id,
            done: false,
            doneAt: null,
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
      } else {
        id = sheet.paper.id;
        await PaperStore.update(id, Object.assign(fields, { updatedAt: now }));
      }
      els.dialog.close();
      await refresh();
      reveal(id);
    } catch (error) {
      console.error(error);
      showSheetError(saveErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // Depuis la feuille : bascule « traité » et enregistre au passage les champs,
  // pour qu'une correction en cours ne soit pas perdue.
  async function onDoneToggle() {
    if (!sheet || sheet.mode !== 'edit' || busy) return;
    els.sheetError.hidden = true;
    const fields = readFields();
    if (!fields) return;

    const paper = sheet.paper;
    setBusy(true);
    try {
      await saveDone(paper, !paper.done, fields, true);
      els.dialog.close();
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

  // Recherche et filtre.
  els.search.addEventListener('input', () => {
    view.query = els.search.value;
    render();
  });
  els.searchClear.addEventListener('click', () => {
    els.search.value = '';
    view.query = '';
    render();
    els.search.focus();
  });
  els.filters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter');
    if (!button) return;
    view.category = button.dataset.filter;
    render();
  });
  els.resetView.addEventListener('click', resetView);

  // Liste : ouvrir un papier, ou le marquer traité.
  els.main.addEventListener('click', (event) => {
    const row = event.target.closest('.paper');
    if (!row) return;
    const paper = papers.find((candidate) => candidate.id === row.dataset.id);
    if (!paper) return;
    if (event.target.closest('.paper-done')) toggleDoneFromList(paper);
    else if (event.target.closest('.paper-open')) openEdit(paper);
  });
  els.main.addEventListener('animationend', (event) => {
    event.target.classList.remove('is-fresh');
  });

  els.toastUndo.addEventListener('click', () => {
    const undo = toastUndo;
    hideToast();
    if (undo) undo();
  });

  // Feuille d'un papier.
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

  els.doneToggle.addEventListener('click', onDoneToggle);
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

  // Au retour sur l'application (le lendemain, par exemple), « Demain »
  // doit devenir « Aujourd'hui » : on redessine la liste.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });

  refresh().catch((error) => {
    console.error(error);
    els.storageError.hidden = false;
  });
})();
