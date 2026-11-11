/*
 * Mes papiers — interface.
 * Étape 1 : liste (vide au départ) et ajout d'un papier par photo ou fichier.
 */
(function () {
  'use strict';

  const THUMBNAIL_MAX_SIDE = 320; // pixels, plus grand côté de la vignette

  const $ = (id) => document.getElementById(id);

  const els = {
    count: $('count'),
    empty: $('empty'),
    list: $('list'),
    addButton: $('add-button'),
    addDialog: $('add-dialog'),
    stepChoose: $('step-choose'),
    stepPreview: $('step-preview'),
    cameraInput: $('camera-input'),
    fileInput: $('file-input'),
    previewImage: $('preview-image'),
    previewFile: $('preview-file'),
    previewCaption: $('preview-caption'),
    changeButton: $('change-button'),
    confirmButton: $('confirm-button'),
    addError: $('add-error'),
    viewer: $('viewer'),
    viewerTitle: $('viewer-title'),
    viewerImage: $('viewer-image'),
  };

  let papers = [];                  // papiers affichés, le plus récent d'abord
  let pending = null;               // { file, source, previewUrl } en attente de confirmation
  let saving = false;
  let viewerUrl = null;
  let openedFileUrl = null;
  const thumbnailUrls = new Map();  // id du papier -> URL de sa vignette

  /* ---------- Mise en forme ---------- */

  const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  function formatSize(bytes) {
    const number = (value, digits) =>
      value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
    if (bytes < 1024) return number(bytes, 0) + ' octets';
    if (bytes < 1024 * 1024) return number(bytes / 1024, 0) + ' Ko';
    return number(bytes / (1024 * 1024), 1) + ' Mo';
  }

  function isImage(type) {
    return typeof type === 'string' && type.startsWith('image/');
  }

  function kindLabel(type) {
    if (isImage(type)) return 'Image';
    if (type === 'application/pdf') return 'PDF';
    return 'Fichier';
  }

  // Tant que le papier n'a pas d'organisme (étape 2), on l'identifie par la
  // date de la photo ou par le nom du fichier.
  function paperTitle(paper) {
    if (paper.source === 'camera') {
      return 'Photo du ' + dateTimeFormat.format(new Date(paper.createdAt));
    }
    return paper.fileName || 'Fichier sans nom';
  }

  function newId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- Vignette ---------- */

  // Fabrique une petite image JPEG pour la liste. Afficher les photos
  // d'origine (plusieurs millions de pixels chacune) saturerait la mémoire
  // d'un téléphone. Renvoie null si le fichier n'est pas une image lisible.
  async function makeThumbnail(file) {
    if (!isImage(file.type)) return null;
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) return null;
      const scale = Math.min(1, THUMBNAIL_MAX_SIDE / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff'; // fond blanc pour les images transparentes
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    } catch (error) {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function thumbnailUrl(paper) {
    if (!paper.thumbnail) return null;
    if (!thumbnailUrls.has(paper.id)) {
      thumbnailUrls.set(paper.id, URL.createObjectURL(paper.thumbnail));
    }
    return thumbnailUrls.get(paper.id);
  }

  /* ---------- Liste ---------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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

    const text = el('span', 'paper-text');
    text.append(
      el('span', 'paper-title', paperTitle(paper)),
      el('span', 'paper-meta', kindLabel(paper.type) + ' · ' + formatSize(paper.size))
    );

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
  }

  async function refresh() {
    const all = await PaperStore.list();
    // Le plus récent d'abord. Le tri par échéance arrive à l'étape 3.
    papers = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    render();
  }

  /* ---------- Ajout d'un papier ---------- */

  function showError(message) {
    els.addError.textContent = message;
    els.addError.hidden = false;
  }

  function clearPending() {
    if (pending && pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    pending = null;
    els.previewImage.removeAttribute('src');
  }

  function showChooseStep() {
    clearPending();
    els.addError.hidden = true;
    els.stepPreview.hidden = true;
    els.stepChoose.hidden = false;
  }

  // Montre soit l'aperçu de l'image, soit une icône de fichier.
  function showPreviewImage(visible) {
    els.previewImage.hidden = !visible;
    els.previewFile.hidden = visible;
  }

  function showPreviewStep(file, source) {
    clearPending();
    els.addError.hidden = true;

    if (file.size === 0) {
      showError('Ce fichier est vide. En choisir un autre.');
      return;
    }

    pending = { file, source, previewUrl: null };
    if (isImage(file.type)) {
      pending.previewUrl = URL.createObjectURL(file);
      els.previewImage.src = pending.previewUrl;
    }
    showPreviewImage(Boolean(pending.previewUrl));

    const name = source === 'camera' ? 'Photo' : file.name || 'Fichier sans nom';
    els.previewCaption.textContent = name + ' · ' + formatSize(file.size);

    els.stepChoose.hidden = true;
    els.stepPreview.hidden = false;
    els.confirmButton.focus();
  }

  function watchInput(input, source) {
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      // On vide le champ pour pouvoir rechoisir le même fichier ensuite.
      input.value = '';
      if (file) showPreviewStep(file, source);
    });
  }

  async function confirmAdd(event) {
    event.preventDefault();
    if (!pending || saving) return;
    saving = true;
    els.confirmButton.disabled = true;
    try {
      const { file, source } = pending;
      await PaperStore.add({
        id: newId(),
        source,                       // 'camera' ou 'file'
        fileName: file.name || '',
        type: file.type || '',
        size: file.size,
        file,                         // le fichier d'origine, intact
        thumbnail: await makeThumbnail(file),
        createdAt: new Date().toISOString(),
      });
      els.addDialog.close();
      await refresh();
    } catch (error) {
      console.error(error);
      showError("Impossible d'ajouter ce papier. Réessayer.");
    } finally {
      saving = false;
      els.confirmButton.disabled = false;
    }
  }

  /* ---------- Consultation ---------- */

  function openPaper(paper) {
    if (isImage(paper.type)) {
      viewerUrl = URL.createObjectURL(paper.file);
      els.viewerImage.src = viewerUrl;
      els.viewerImage.alt = paperTitle(paper);
      els.viewerTitle.textContent = paperTitle(paper);
      els.viewer.showModal();
      return;
    }
    // PDF et autres fichiers : on laisse le navigateur les afficher.
    if (openedFileUrl) URL.revokeObjectURL(openedFileUrl);
    openedFileUrl = URL.createObjectURL(paper.file);
    window.open(openedFileUrl, '_blank');
  }

  /* ---------- Branchements ---------- */

  function setUpDialog(dialog) {
    dialog.addEventListener('click', (event) => {
      // Un clic hors du contenu (sur le fond assombri) ferme la fenêtre.
      if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
    });
  }

  els.addButton.addEventListener('click', () => {
    showChooseStep();
    els.addDialog.showModal();
  });

  watchInput(els.cameraInput, 'camera');
  watchInput(els.fileInput, 'file');
  // Image que le navigateur ne sait pas afficher : on montre l'icône à la place.
  els.previewImage.addEventListener('error', () => showPreviewImage(false));
  els.changeButton.addEventListener('click', showChooseStep);
  els.stepPreview.addEventListener('submit', confirmAdd);
  els.addDialog.addEventListener('close', clearPending);
  setUpDialog(els.addDialog);

  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('.paper');
    if (!button) return;
    const paper = papers.find((candidate) => candidate.id === button.dataset.id);
    if (paper) openPaper(paper);
  });

  els.viewer.addEventListener('close', () => {
    els.viewerImage.removeAttribute('src');
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    viewerUrl = null;
  });
  setUpDialog(els.viewer);

  refresh();
})();
