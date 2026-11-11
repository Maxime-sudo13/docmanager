/*
 * Mes papiers — interface.
 * Étape 4 : rappels 7 jours avant la date limite et la veille, par
 * notification et par fichier de calendrier (voir reminders.js).
 * Les données sont enregistrées sur l'appareil (voir store.js).
 */
(function () {
  'use strict';

  const THUMBNAIL_MAX_SIDE = 320; // pixels, plus grand côté de la vignette
  const PHOTO_MAX_SIDE = 2400;    // pixels, plus grand côté d'une photo enregistrée
  const TOAST_DELAY = 6000;       // millisecondes
  const REMINDER_CHECK_DELAY = 60 * 60 * 1000; // les rappels sont revérifiés toutes les heures

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
    bell: $('bell'),
    bellDot: $('bell-dot'),
    storageError: $('storage-error'),
    simulatedDate: $('simulated-date'),
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
    toastAction: $('toast-action'),
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
    calendarRow: $('calendar-row'),
    calendarButton: $('calendar-button'),
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
    remindersDialog: $('reminders-dialog'),
    remindersStatus: $('reminders-status'),
    remindersEnable: $('reminders-enable'),
    remindersTest: $('reminders-test'),
    remindersFeedback: $('reminders-feedback'),
    upcomingList: $('upcoming-list'),
    upcomingEmpty: $('upcoming-empty'),
  };

  let papers = [];                    // toutes les fiches
  const view = { query: '', category: 'all' }; // recherche et filtre en cours
  // Feuille ouverte : { mode: 'add', file, fileUrl } pour un nouveau papier,
  // { mode: 'edit', paper, fileUrl } pour un papier existant, sinon null.
  let sheet = null;
  let busy = false;
  let filtersShown = '';              // catégories actuellement proposées dans le filtre
  let toastTimer = null;
  let toastAction = null;             // ce que fait le bouton du message bref
  // Le service worker, s'il a pu être installé (il faut une adresse en https
  // ou localhost) ; sinon null. C'est lui qui affiche les notifications.
  let serviceWorker = Promise.resolve(null);
  let backgroundCheck = false;        // vrai si les échéances sont vérifiées application fermée
  const thumbnailUrls = new Map();    // id du papier -> URL de sa vignette
  const searchTexts = new Map();      // id du papier -> texte dans lequel on cherche

  /* ---------- Mise en forme ---------- */

  const formats = {
    long: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    dueThisYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }),
    dueOtherYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
  };

  function formatSize(bytes) {
    const number = (value, digits) =>
      value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
    if (bytes < 1024) return number(bytes, 0) + ' octets';
    if (bytes < 1024 * 1024) return number(bytes / 1024, 0) + ' Ko';
    return number(bytes / (1024 * 1024), 1) + ' Mo';
  }

  // Les calculs de jours sont dans reminders.js, que le service worker
  // utilise aussi : une seule définition de « aujourd'hui » et de « proche ».
  const parseDay = Reminders.parseDay;

  function formatDueDate(date) {
    const thisYear = date.getFullYear() === Reminders.today().getFullYear();
    return Reminders.formatDay(thisYear ? formats.dueThisYear : formats.dueOtherYear, date);
  }

  // Ce qu'on affiche pour l'échéance d'un papier : { text, level }, où level
  // vaut 'late' (dépassée), 'soon' (dans la semaine) ou '' (rien de pressant).
  function dueInfo(paper) {
    const date = parseDay(paper.dueDate);
    if (!date) return null;
    const day = formatDueDate(date);
    if (paper.done) return { text: 'Date limite : ' + day, level: '' };
    const days = Reminders.daysUntil(paper.dueDate);
    if (days < 0) return { text: 'En retard · ' + day, level: 'late' };
    if (days === 0) return { text: "Aujourd'hui", level: 'soon' };
    if (days === 1) return { text: 'Demain · ' + day, level: 'soon' };
    if (days <= Reminders.WEEK_DAYS) return { text: 'Dans ' + days + ' jours · ' + day, level: 'soon' };
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
        date ? Reminders.formatDay(formats.long, date) : '',
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
    renderBell();

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
    toastAction = null;
  }

  // `action` est facultatif : s'il est donné, un bouton `label` le déclenche.
  function showToast(message, action, label) {
    els.toastText.textContent = message;
    els.toastAction.hidden = !action;
    els.toastAction.textContent = label || 'Annuler';
    toastAction = action || null;
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
    showToast(
      done ? name + ' est traité.' : name + ' est remis à traiter.',
      () => saveDone(paper, !done, null, false).catch(reportDoneError),
      'Annuler'
    );
  }

  function reportDoneError(error) {
    console.error(error);
    showToast("Le changement n'a pas pu être enregistré.");
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

  /* ---------- Rappels : notifications ---------- */

  // 'granted' (activées), 'default' (pas encore demandées), 'denied'
  // (refusées) ou 'unavailable' (impossibles ici).
  function notificationState() {
    if (
      typeof Notification === 'undefined' ||
      !window.isSecureContext ||
      location.protocol === 'file:'
    ) {
      return 'unavailable';
    }
    return Notification.permission;
  }

  function unavailableReason() {
    if (location.protocol === 'file:') {
      return "Les notifications ne fonctionnent pas quand l'application est ouverte comme un simple fichier : il lui faut une adresse web.";
    }
    if (!window.isSecureContext) {
      return "Les notifications demandent une adresse sécurisée (https). Elles fonctionneront une fois l'application mise en ligne.";
    }
    return "Les notifications ne sont pas disponibles dans ce navigateur. Sur iPhone, il faut d'abord installer l'application sur l'écran d'accueil.";
  }

  // Sur Android, seule une notification passant par le service worker est
  // permise. La page n'affiche elle-même qu'à défaut.
  async function notify(title, options) {
    const registration = await serviceWorker;
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.data && options.data.id) openPaperById(options.data.id);
    };
  }

  function registerServiceWorker() {
    if (
      !('serviceWorker' in navigator) ||
      !window.isSecureContext ||
      location.protocol === 'file:'
    ) {
      return Promise.resolve(null);
    }
    return navigator.serviceWorker
      .register('sw.js')
      .then(() => navigator.serviceWorker.ready)
      .catch((error) => {
        console.error(error);
        return null;
      });
  }

  // Demande au navigateur de réveiller le service worker de temps en temps,
  // application fermée. Seul Chrome sur Android l'accorde, et seulement à
  // une application installée.
  async function registerBackgroundCheck() {
    backgroundCheck = false;
    try {
      const registration = await serviceWorker;
      if (!registration || !('periodicSync' in registration)) return;
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state !== 'granted') return;
      await registration.periodicSync.register('rappels', { minInterval: 12 * 60 * 60 * 1000 });
      backgroundCheck = true;
    } catch (error) {
      // Pas pris en charge ici : les rappels restent donnés à l'ouverture.
    }
  }

  // Donne les rappels dus. Appelé à l'ouverture, au retour sur
  // l'application, et toutes les heures tant qu'elle reste ouverte.
  async function checkReminders() {
    if (notificationState() !== 'granted') return;
    try {
      const given = await Reminders.check(notify);
      if (given.length > 0) await refresh();
    } catch (error) {
      console.error(error);
    }
  }

  // Le point sur la cloche signale qu'il reste à activer les notifications.
  function renderBell() {
    const attention =
      notificationState() === 'default' &&
      papers.some((paper) => !paper.done && paper.dueDate);
    els.bellDot.hidden = !attention;
    els.bell.setAttribute(
      'aria-label',
      attention ? 'Rappels : notifications à activer' : 'Rappels'
    );
  }

  function renderReminders() {
    const state = notificationState();
    if (state === 'granted') {
      els.remindersStatus.textContent =
        'Les notifications sont activées sur cet appareil.' +
        (backgroundCheck
          ? " Les échéances sont aussi vérifiées de temps en temps quand l'application est fermée."
          : '');
    } else if (state === 'default') {
      els.remindersStatus.textContent = 'Les notifications ne sont pas encore activées.';
    } else if (state === 'denied') {
      els.remindersStatus.textContent =
        'Les notifications sont bloquées pour cette application. Pour les rétablir, les autoriser dans les réglages du navigateur, puis revenir ici.';
    } else {
      els.remindersStatus.textContent = unavailableReason();
    }
    els.remindersEnable.hidden = state !== 'default';
    els.remindersTest.hidden = state !== 'granted';

    const start = Reminders.today().getTime();
    const items = Reminders.upcoming(papers);
    const shown = items.slice(0, 6);
    els.upcomingEmpty.hidden = items.length > 0;
    els.upcomingList.replaceChildren(
      ...shown.map((item) => {
        const line = el('li');
        const day =
          item.date.getTime() === start ? "aujourd'hui" : Reminders.formatDay(formats.weekday, item.date);
        line.append(
          el('span', 'upcoming-date', day),
          el('span', 'upcoming-name', item.paper.organisation),
          el('span', 'upcoming-stage', item.stage === 'week' ? '7 jours avant' : 'la veille')
        );
        return line;
      })
    );
    if (items.length > shown.length) {
      els.upcomingList.append(
        el('li', 'upcoming-more', 'et ' + (items.length - shown.length) + ' autres')
      );
    }
  }

  function openReminders() {
    els.remindersFeedback.textContent = '';
    renderBell();
    renderReminders();
    if (!els.remindersDialog.open) els.remindersDialog.showModal();
  }

  // À appeler chaque fois que l'autorisation a pu changer, que ce soit par
  // notre bouton ou dans les réglages du navigateur.
  async function afterPermissionChange() {
    if (notificationState() === 'granted') {
      await registerBackgroundCheck();
      checkReminders();
    }
    renderBell();
    if (els.remindersDialog.open) renderReminders();
  }

  async function enableNotifications() {
    if (notificationState() === 'default') {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.error(error);
      }
    }
    await afterPermissionChange();
    const state = notificationState();
    if (els.remindersDialog.open) return; // la feuille « Rappels » montre déjà le résultat
    if (state === 'granted') showToast('Notifications activées.');
    // Refusées ou impossibles : la feuille explique comment faire autrement.
    // (Demande simplement écartée : on n'insiste pas.)
    else if (state !== 'default') openReminders();
  }

  async function sendTestNotification() {
    try {
      await notify('Mes papiers', {
        body: "Notification d'essai : les rappels s'afficheront comme ceci.",
        tag: 'essai',
        data: {},
        lang: 'fr',
      });
      els.remindersFeedback.textContent = "Notification d'essai envoyée.";
    } catch (error) {
      console.error(error);
      els.remindersFeedback.textContent = "La notification n'a pas pu être affichée.";
    }
  }

  /* ---------- Rappels : calendrier ---------- */

  // Télécharge un fichier .ics : l'ouvrir ajoute l'échéance à l'agenda du
  // téléphone, avec une alerte 7 jours avant et une autre la veille.
  function downloadCalendar(paper) {
    const text = Reminders.toICS(paper, categoryLabel(paper.category));
    if (!text) return;
    const slug = normalize(paper.organisation)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const link = el('a');
    link.href = url;
    link.download = 'date-limite-' + (slug || 'papier') + '.ics';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // Après l'enregistrement d'une date limite : propose d'activer les
  // notifications, sinon d'ajouter l'échéance au calendrier.
  function offerReminders(paper) {
    if (!paper || paper.done || Reminders.upcoming([paper]).length === 0) return;
    const state = notificationState();
    if (state === 'default') {
      showToast('Être prévenu 7 jours avant et la veille ?', enableNotifications, 'Activer');
    } else if (state === 'granted') {
      showToast('Rappels prévus 7 jours avant et la veille.', () => downloadCalendar(paper), 'Calendrier');
    } else {
      showToast("Pour un rappel, ajouter l'échéance au calendrier.", () => downloadCalendar(paper), 'Calendrier');
    }
  }

  // Arrivée par une notification, application fermée : l'adresse se termine
  // par « #papier=… », qui désigne le papier à ouvrir.
  function openPaperFromAddress() {
    const match = /^#papier=(.+)$/.exec(location.hash);
    if (!match) return;
    history.replaceState(null, '', location.pathname + location.search);
    openPaperById(decodeURIComponent(match[1]));
  }

  function openPaperById(id) {
    const paper = papers.find((candidate) => candidate.id === id);
    // On ne remplace pas une feuille déjà ouverte : une saisie est peut-être en cours.
    if (paper && !els.dialog.open) openEdit(paper);
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

  // « Ajouter au calendrier » n'a de sens que pour un papier enregistré, à
  // traiter, et qui a une date limite.
  function renderCalendarRow() {
    els.calendarRow.hidden = !(
      sheet &&
      sheet.mode === 'edit' &&
      !sheet.paper.done &&
      els.dueDate.value !== ''
    );
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
    renderCalendarRow();
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
      ? 'Traité le ' + Reminders.formatDay(formats.long, new Date(paper.doneAt))
      : 'Traité';

    const radio = els.categoryChips.querySelector('input[value="' + paper.category + '"]');
    if (radio) radio.checked = true;
    els.organisation.value = paper.organisation;
    els.dueDate.value = paper.dueDate || '';
    renderCalendarRow();
    els.previewCaption.textContent =
      kindLabel(paper.type) +
      ' · ' +
      formatSize(paper.size) +
      ' · ajouté le ' +
      Reminders.formatDay(formats.long, new Date(paper.createdAt));

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
    els.calendarButton.disabled = value;
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

    // Si la date limite change, les rappels repartent de zéro pour la
    // nouvelle date (sans prévenir d'une échéance qu'on vient de saisir).
    const previous = sheet && sheet.mode === 'edit' ? sheet.paper.dueDate : undefined;
    const reminded = (dueValue || null) !== previous ? Reminders.armed(dueValue) : undefined;

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
    const fields = { category: checked.value, organisation, dueDate: dueValue || null };
    if (reminded) fields.reminded = reminded;
    return fields;
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
      if (fields.reminded) offerReminders(papers.find((paper) => paper.id === id));
    } catch (error) {
      console.error(error);
      showSheetError(saveErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // Depuis la feuille : enregistre les champs s'ils ont changé, puis
  // télécharge le fichier de calendrier.
  async function onCalendar() {
    if (!sheet || sheet.mode !== 'edit' || busy) return;
    els.sheetError.hidden = true;
    const fields = readFields();
    if (!fields || !fields.dueDate) return;

    setBusy(true);
    try {
      let paper = sheet.paper;
      const changed =
        fields.category !== paper.category ||
        fields.organisation !== paper.organisation ||
        fields.dueDate !== paper.dueDate;
      if (changed) {
        paper = await PaperStore.update(
          paper.id,
          Object.assign(fields, { updatedAt: new Date().toISOString() })
        );
        sheet.paper = paper;
        await refresh();
      }
      downloadCalendar(paper);
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

  els.toastAction.addEventListener('click', () => {
    const action = toastAction;
    hideToast();
    if (action) action();
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
  els.dueDate.addEventListener('input', () => {
    setFieldError(els.dueDateError, els.dueDate, false);
    renderCalendarRow();
  });
  els.calendarButton.addEventListener('click', onCalendar);

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

  // Rappels.
  els.bell.addEventListener('click', openReminders);
  els.remindersEnable.addEventListener('click', enableNotifications);
  els.remindersTest.addEventListener('click', sendTestNotification);
  els.remindersDialog.addEventListener('click', (event) => {
    if (event.target === els.remindersDialog || event.target.closest('[data-close]')) {
      els.remindersDialog.close();
    }
  });
  // L'autorisation peut aussi être donnée ou retirée dans les réglages du
  // navigateur, pendant que l'application est ouverte.
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions
      .query({ name: 'notifications' })
      .then((status) => {
        status.onchange = afterPermissionChange;
      })
      .catch(() => {
        // Ce navigateur ne sait pas prévenir : l'état est relu à chaque affichage.
      });
  }
  // Toucher une notification demande à ouvrir le papier concerné.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'open-paper') openPaperById(event.data.id);
    });
  }

  // Au retour sur l'application (le lendemain, par exemple), « Demain »
  // doit devenir « Aujourd'hui » : on redessine la liste et on revérifie
  // les rappels.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    render();
    checkReminders();
  });
  setInterval(checkReminders, REMINDER_CHECK_DELAY);

  // Pour les essais : « ?date=AAAA-MM-JJ » dans l'adresse fait croire à
  // l'application que nous sommes ce jour-là (voir README).
  const simulated = Reminders.simulateToday(new URLSearchParams(location.search).get('date'));
  if (simulated) {
    els.simulatedDate.textContent =
      'Essai : l\'application fait comme si nous étions le ' +
      Reminders.formatDay(formats.long, simulated) +
      '. Retirer « ?date=… » de l\'adresse pour revenir à la vraie date.';
    els.simulatedDate.hidden = false;
  }

  serviceWorker = registerServiceWorker();

  refresh().then(
    async () => {
      openPaperFromAddress();
      window.addEventListener('hashchange', openPaperFromAddress);
      if (notificationState() === 'granted') await registerBackgroundCheck();
      checkReminders();
    },
    (error) => {
      console.error(error);
      els.storageError.hidden = false;
    }
  );
})();
