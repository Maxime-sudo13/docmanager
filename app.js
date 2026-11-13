/*
 * Mes papiers — interface.
 * Design « Papeterie ». Sur ordinateur, trois volets : les catégories à
 * gauche, la liste au milieu, la fiche du papier à droite. Une échéance peut
 * revenir (abonnement, assurance…) et porter un montant.
 * Les données sont enregistrées sur l'appareil (voir store.js).
 */
(function () {
  'use strict';

  const THUMBNAIL_MAX_SIDE = 320; // pixels, plus grand côté de la vignette
  const PHOTO_MAX_SIDE = 2400;    // pixels, plus grand côté d'une photo enregistrée
  const TOAST_DELAY = 6000;       // millisecondes
  // Au-delà de cette largeur, l'écran est découpé en trois volets (voir style.css).
  const WIDE = window.matchMedia('(min-width: 1000px)');
  const REMINDER_CHECK_DELAY = 60 * 60 * 1000; // les rappels sont revérifiés toutes les heures
  const BACKUP_KEY = 'mes-papiers.derniere-sauvegarde'; // réglage gardé par le navigateur
  const THEME_KEY = 'mes-papiers.theme';                 // 'light' (par défaut) ou 'dark'
  const SNOOZE_KEY = 'mes-papiers.rappel-sauvegarde';    // « Plus tard » : date de fin
  const SNOOZE_DAYS = 7;
  const BACKUP_MAX_AGE = 30 * 24 * 60 * 60 * 1000;      // au-delà, une sauvegarde est conseillée
  const BACKUP_MIN_PAPERS = 3;                          // en dessous, pas la peine d'insister
  const HISTORY_MAX = 24;                               // échéances traitées gardées en mémoire
  const AMOUNT_MAX = 100000000;                         // un million d'euros, en centimes

  // Échéances qui reviennent : nombre de mois entre deux échéances.
  const REPEATS = { 1: 'Chaque mois', 3: 'Tous les 3 mois', 12: 'Chaque année', 24: 'Tous les 2 ans' };

  // Catégories fixes. L'identifiant est ce qui est enregistré.
  const CATEGORIES = [
    { id: 'impots', label: 'Impôts' },
    { id: 'sante', label: 'Santé' },
    { id: 'logement', label: 'Logement' },
    { id: 'banque', label: 'Banque' },
    { id: 'energie', label: 'Énergie' },
    { id: 'autre', label: 'Autre' },
  ];

  // Icônes des catégories (dessin au trait, couleur de la catégorie).
  const ICON = (path) =>
    '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    path +
    '</svg>';
  const CATEGORY_ICONS = {
    impots: ICON('<path d="M4 20h16M6 20v-9M10 20v-9M14 20v-9M18 20v-9M3 9l9-5 9 5z"/>'),
    sante: ICON('<path d="M12 20s-7-4.3-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5C19 15.7 12 20 12 20z"/>'),
    logement: ICON('<path d="M4 11l8-6 8 6v9H4zM10 20v-5h4v5"/>'),
    banque: ICON('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>'),
    energie: ICON('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'),
    autre: ICON('<path d="M7.5 3.5H14l5 5v10a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5V6a2.5 2.5 0 0 1 2.5-2.5z"/><path d="M14 3.5V7a1.5 1.5 0 0 0 1.5 1.5H19"/>'),
  };

  // Objet (voiture, logement, appareil) : une étiquette.
  const THING_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6l8 8a1.5 1.5 0 0 1 0 2.1l-7.5 7.5a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.4"/></svg>';

  const CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const $ = (id) => document.getElementById(id);

  const els = {
    main: document.querySelector('.app-main'),
    count: $('count'),
    today: $('today'),
    viewTitle: $('view-title'),
    summary: $('summary'),
    sumLate: $('sum-late'),
    sumWeek: $('sum-week'),
    sumTodo: $('sum-todo'),
    sumRegular: $('sum-regular'),
    sumRegularTotal: $('sum-regular-total'),
    autoSection: $('auto-section'),
    autoCount: $('auto-count'),
    autoList: $('auto-list'),
    amount: $('amount'),
    amountError: $('amount-error'),
    repeat: $('repeat'),
    autopayRow: $('autopay-row'),
    autopay: $('autopay'),
    repeatHistory: $('repeat-history'),
    moneyToggle: $('money-toggle'),
    moneyBlock: $('money-block'),
    moreRow: $('more-row'),
    thingToggle: $('thing-toggle'),
    thingField: $('thing-field'),
    thing: $('thing'),
    thingList: $('thing-list'),
    tabs: $('tabs'),
    tabPapers: $('tab-papers'),
    tabThings: $('tab-things'),
    thingsPage: $('things-page'),
    thingsGrid: $('things-grid'),
    thingsEmpty: $('things-empty'),
    thingBack: $('thing-back'),
    sideThingsAll: $('side-things-all'),
    sideThingsCount: $('side-things-count'),
    sideThings: $('side-things'),
    thingCard: $('thing-card'),
    thingName: $('thing-name'),
    thingStats: $('thing-stats'),
    thingRename: $('thing-rename'),
    thingRenameInput: $('thing-rename-input'),
    thingRenameCancel: $('thing-rename-cancel'),
    thingRenameButton: $('thing-rename-button'),
    thingActions: $('thing-actions'),
    categoryField: $('category-chips').closest('fieldset'),
    dueRequiredError: $('due-required-error'),
    sideNav: $('side-nav'),
    sideAdd: $('side-add'),
    sideBell: $('side-bell'),
    sideBellDot: $('side-bell-dot'),
    sideMenu: $('side-menu'),
    sideMenuDot: $('side-menu-dot'),
    backupReminder: $('backup-reminder'),
    backupReminderText: $('backup-reminder-text'),
    backupReminderLater: $('backup-reminder-later'),
    backupReminderSave: $('backup-reminder-save'),
    bell: $('bell'),
    bellDot: $('bell-dot'),
    menuButton: $('menu-button'),
    menuDot: $('menu-dot'),
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
    reminderRow: $('reminder-row'),
    saveButton: $('save-button'),
    doneToggle: $('done-toggle'),
    deleteZone: $('delete-zone'),
    deleteButton: $('delete-button'),
    deleteConfirm: $('delete-confirm'),
    deleteCancel: $('delete-cancel'),
    deleteYes: $('delete-yes'),
    sheetError: $('sheet-error'),
    pagesList: $('pages-list'),
    pagesBlock: $('pages-block'),
    noteChoice: $('note-choice'),
    noteField: $('note-field'),
    noteToggle: $('note-toggle'),
    note: $('note'),
    noteOptional: $('note-optional'),
    noteError: $('note-error'),
    pageInput: $('page-input'),
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
    settingsDialog: $('settings-dialog'),
    backupSummary: $('backup-summary'),
    backupExport: $('backup-export'),
    backupImport: $('backup-import'),
    backupFeedback: $('backup-feedback'),
    installStatus: $('install-status'),
    installButton: $('install-button'),
  };

  let papers = [];                    // toutes les fiches
  // Page affichée (`page`) : 'papers' (la liste), 'things' (les objets) ou
  // 'thing' (un objet et ses papiers, `thing` étant sa clé, voir thingKey).
  // Sur la page des papiers : recherche, catégorie, et `regular` pour ne
  // garder que les échéances qui reviennent.
  const view = { page: 'papers', query: '', category: 'all', regular: false, thing: '' };
  let things = [];                    // objets : [{ key, name, papers }], par nom
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
  let installPrompt = null;           // proposition d'installation du navigateur, s'il en fait une
  let backupBusy = false;
  let pendingBackup = null;           // sauvegarde prête, en attente d'un geste pour être remise
  const thumbnailUrls = new Map();    // id du papier -> URL de sa vignette
  const searchTexts = new Map();      // id du papier -> texte dans lequel on cherche

  /* ---------- Mise en forme ---------- */

  const formats = {
    long: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    dueThisYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }),
    dueOtherYear: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    today: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }),
  };

  const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

  // Montants : enregistrés en centimes (nombres entiers, sans erreur d'arrondi).
  function formatAmount(cents) {
    return euros.format(cents / 100);
  }

  // « 45,90 », « 45.9 », « 1 200 € » → centimes. Vide → null. Illégible → NaN.
  function parseAmount(text) {
    const clean = String(text).replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.');
    if (clean === '') return null;
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
    const cents = Math.round(Number(clean) * 100);
    return cents <= AMOUNT_MAX ? cents : NaN;
  }

  // Pour remplir le champ : « 45,90 », ou « 45 » pour un compte rond.
  function amountForInput(cents) {
    if (typeof cents !== 'number') return '';
    return (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)).replace('.', ',');
  }

  function isRegular(paper) {
    return paper.repeat > 0 && Boolean(paper.dueDate);
  }

  function isAutoPaid(paper) {
    return !paper.done && isRegular(paper) && Boolean(paper.autoPay);
  }

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
    if (isAutoPaid(paper)) return { text: 'Prochain prélèvement : ' + day, level: '' };
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

  /* ---------- Objets ---------- */

  // Deux papiers sont du même objet si leurs noms ne diffèrent que par les
  // majuscules, les accents ou les espaces : « clio » et « Clio ».
  function thingKey(name) {
    return name ? normalize(name).replace(/\s+/g, ' ').trim() : '';
  }

  function cleanThing(text) {
    return String(text || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  }

  // Les objets, chacun sous le nom le plus souvent écrit.
  function collectThings() {
    const groups = new Map();
    for (const paper of papers) {
      const key = thingKey(paper.thing);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, { key, papers: [], spellings: new Map() });
      const group = groups.get(key);
      group.papers.push(paper);
      const spelling = group.spellings.get(paper.thing) || { count: 0, first: paper.createdAt };
      spelling.count++;
      if (paper.createdAt < spelling.first) spelling.first = paper.createdAt;
      group.spellings.set(paper.thing, spelling);
    }
    // À égalité, l'orthographe saisie la première l'emporte.
    const best = (a, b) => b[1].count - a[1].count || a[1].first.localeCompare(b[1].first);
    return [...groups.values()]
      .map((group) => ({
        key: group.key,
        papers: group.papers,
        name: [...group.spellings].sort(best)[0][0],
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
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
        paper.note || '',
        date ? Reminders.formatDay(formats.long, date) : '',
        typeof paper.amount === 'number' ? formatAmount(paper.amount) + ' ' + amountForInput(paper.amount) : '',
        isRegular(paper) ? REPEATS[paper.repeat] || '' : '',
        isAutoPaid(paper) ? 'prélèvement automatique' : '',
        paper.thing || '',
      ].join(' ')
    );
  }

  function matchesView(paper) {
    if (view.page === 'thing') return thingKey(paper.thing) === view.thing;
    if (view.page === 'things') return false;
    if (view.category !== 'all' && paper.category !== view.category) return false;
    if (view.regular && !isRegular(paper)) return false;
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
  // Petit calendrier : le mois en haut, le jour en grand. Coloré selon la
  // catégorie, ou en rouge si l'échéance est passée.
  function calendarBlock(paper, due) {
    const block = el('span', 'cal');
    block.dataset.category = paper.category;
    block.setAttribute('aria-hidden', 'true');
    const date = parseDay(paper.dueDate);
    if (!date) {
      // Sans date limite : la bande de couleur reste, avec l'icône de la
      // catégorie à la place du jour.
      block.classList.add('cal-none');
      const icon = el('span', 'cal-icon');
      icon.innerHTML = CATEGORY_ICONS[paper.category] || CATEGORY_ICONS.autre;
      block.append(el('span', 'cal-m', 'Sans date'), icon);
      return block;
    }
    if (due && due.level === 'late') block.classList.add('cal-late');
    const month = formats.month.format(date).replace('.', '');
    block.append(el('span', 'cal-m', month), el('span', 'cal-d', String(date.getDate())));
    if (date.getFullYear() !== Reminders.today().getFullYear()) {
      block.append(el('span', 'cal-y', String(date.getFullYear())));
    }
    return block;
  }

  function isSelected(paper) {
    return Boolean(sheet && sheet.mode === 'edit' && sheet.paper.id === paper.id);
  }

  function renderPaper(paper) {
    const item = el('li', 'paper' + (paper.done ? ' is-done' : '') + (isSelected(paper) ? ' is-selected' : ''));
    item.dataset.id = paper.id;
    item.dataset.category = paper.category;

    const open = el('button', 'paper-open');
    open.type = 'button';

    const due = dueInfo(paper);
    const date = calendarBlock(paper, due);

    const meta = el('span', 'paper-meta');
    meta.append(categoryTag(paper.category));
    if (due) {
      const label = el('span', 'paper-due', due.text);
      if (due.level) label.dataset.level = due.level;
      meta.append(label);
    }
    if (typeof paper.amount === 'number') meta.append(el('span', 'paper-amount', formatAmount(paper.amount)));
    if (paper.thing && view.page !== 'thing') {
      const thing = el('span', 'paper-thing');
      thing.innerHTML = THING_ICON;
      thing.append(paper.thing);
      meta.append(thing);
    }
    if (isRegular(paper) && !paper.done) {
      const label = (REPEATS[paper.repeat] || '').toLowerCase();
      meta.append(el('span', 'paper-repeat', isAutoPaid(paper) ? 'prélevé ' + label : label));
    }
    const pageCount = 1 + (paper.extraPages || []).length;
    if (pageCount > 1) meta.append(el('span', 'paper-pages', pageCount + ' pages'));
    const noteLine = (paper.note || '').split('\n').find((line) => line.trim()) || '';

    const text = el('span', 'paper-text');
    text.append(el('span', 'paper-title', paper.organisation), meta);
    if (noteLine) text.append(el('span', 'paper-note', noteLine.trim()));
    open.append(date, text);

    const done = el('button', 'paper-done');
    done.type = 'button';
    done.setAttribute('aria-pressed', String(Boolean(paper.done)));
    const action = paper.done ? 'Remettre à traiter' : 'Marquer comme traité';
    if (isRegular(paper) && !paper.done) done.classList.add('is-regular');
    done.setAttribute('aria-label', action + ' : ' + paper.organisation);
    done.title = action;
    const check = el('span', 'check');
    check.innerHTML = CHECK_ICON;
    done.append(check);

    // Un prélèvement automatique n'attend aucun geste : pas de rond « traité ».
    if (isAutoPaid(paper)) item.append(open);
    else item.append(open, done);
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
      button.setAttribute('aria-pressed', String(view.page === 'papers' && button.dataset.filter === view.category && !view.regular));
    }
    renderSideNav(used);
  }

  // Ordinateur : les catégories en colonne, avec le nombre de papiers.
  function renderSideNav(used) {
    const entry = (id, label, count) => {
      const button = el('button', 'side-item');
      button.type = 'button';
      button.dataset.filter = id;
      if (id !== 'all') button.dataset.category = id;
      button.setAttribute('aria-pressed', String(view.page === 'papers' && view.category === id && !view.regular));
      button.append(el('span', 'dot'), el('span', 'side-label', label), el('span', 'side-count', String(count)));
      return button;
    };
    els.sideNav.replaceChildren(
      entry('all', 'Tous les papiers', papers.length),
      ...used.map((category) =>
        entry(category.id, category.label, papers.filter((paper) => paper.category === category.id).length)
      )
    );
    const current = CATEGORIES.find((category) => category.id === view.category);
    const thing = things.find((candidate) => candidate.key === view.thing);
    els.viewTitle.textContent = view.page === 'thing' && thing
      ? thing.name
      : view.page === 'things'
        ? 'Objets'
        : view.regular
        ? 'Dépenses régulières'
        : current ? current.label : 'Tous les papiers';
  }

  // En haut de l'écran : en retard, dans les 7 jours, et en tout à traiter.
  function renderSummary(pending) {
    let late = 0;
    let week = 0;
    for (const paper of papers) {
      if (!Reminders.needsAction(paper)) continue;
      const days = Reminders.daysUntil(paper.dueDate);
      if (days === null) continue;
      if (days < 0) late++;
      else if (days <= Reminders.WEEK_DAYS) week++;
    }
    els.summary.hidden = false; // affiché même vide : « 0 en retard » est une bonne nouvelle
    els.sumLate.textContent = late;
    els.sumWeek.textContent = week;
    els.sumTodo.textContent = pending;
    els.summary.classList.toggle('has-late', late > 0);
    els.summary.classList.toggle('has-week', week > 0);
    renderRegularTotal();
    const today = formats.today.format(Reminders.today());
    els.today.textContent = today.charAt(0).toUpperCase() + today.slice(1);
  }

  // Sous les trois cases : ce que coûtent par mois les échéances qui
  // reviennent (une assurance à 600 € par an compte pour 50 € par mois).
  function renderRegularTotal() {
    const regular = papers.filter((paper) => !paper.done && isRegular(paper));
    if (regular.length === 0 && view.regular) view.regular = false;
    els.sumRegular.hidden = regular.length === 0;
    const perMonth = regular.reduce(
      (sum, paper) => sum + (typeof paper.amount === 'number' ? paper.amount / paper.repeat : 0),
      0
    );
    if (perMonth > 0) {
      els.sumRegularTotal.replaceChildren(
        formatAmount(Math.round(perMonth)),
        el('span', 'regular-unit', ' par mois')
      );
    } else {
      els.sumRegularTotal.textContent = regular.length + (regular.length > 1 ? ' échéances' : ' échéance');
    }
    els.sumRegular.title = perMonth > 0
      ? 'Soit ' + formatAmount(Math.round(perMonth * 12)) + ' par an. Toucher pour les afficher.'
      : 'Toucher pour les afficher.';
    els.sumRegular.setAttribute('aria-pressed', String(view.regular));
  }

  // Les objets : la page « Objets » (une carte par objet), la liste de la
  // barre latérale sur ordinateur, et l'en-tête de la page d'un objet.
  function renderThings() {
    things = collectThings();
    // Un objet qui n'a plus de papier (renommé, vidé, supprimé) : retour à la liste.
    if (view.page === 'thing' && !things.some((thing) => thing.key === view.thing)) {
      setRoute('things', '', true);
    }

    const icon = () => {
      const span = el('span', 'thing-icon');
      span.innerHTML = THING_ICON;
      return span;
    };
    els.sideThingsCount.textContent = things.length ? String(things.length) : '';
    els.sideThingsAll.setAttribute('aria-pressed', String(view.page === 'things'));
    els.sideThings.hidden = things.length === 0;
    els.sideThings.replaceChildren(
      ...things.map((thing) => {
        const button = el('button', 'side-item');
        button.type = 'button';
        button.dataset.thing = thing.key;
        button.setAttribute('aria-pressed', String(view.page === 'thing' && view.thing === thing.key));
        button.append(el('span', 'side-label', thing.name), el('span', 'side-count', String(thing.papers.length)));
        return button;
      })
    );
    els.thingList.replaceChildren(
      ...things.map((thing) => {
        const option = el('option');
        option.value = thing.name;
        return option;
      })
    );

    if (view.page === 'things') {
      els.thingsEmpty.hidden = things.length > 0;
      els.thingsGrid.replaceChildren(
        ...things.map((thing) => {
          const item = el('li');
          const button = el('button', 'thing-tile');
          button.type = 'button';
          button.dataset.thing = thing.key;
          const stats = thingStats(thing);
          const text = el('span', 'thing-tile-text');
          text.append(el('span', 'thing-tile-name', thing.name), el('span', 'thing-tile-stats', stats.summary));
          if (stats.next) {
            const next = el('span', 'thing-tile-next', stats.next.text);
            if (stats.next.level) next.dataset.level = stats.next.level;
            text.append(next);
          }
          button.append(icon(), text, el('span', 'thing-tile-arrow', '›'));
          item.append(button);
          return item;
        })
      );
    }
    renderThingCard();
  }

  // Ce qu'on dit d'un objet : nombre de papiers, montants, prochaine échéance.
  // Une échéance qui revient compte autant de fois qu'elle a été traitée
  // (chaque fois, elle a été payée), plus l'échéance en cours.
  function thingStats(thing) {
    let cents = 0;
    let next = null;
    for (const paper of thing.papers) {
      if (typeof paper.amount === 'number') cents += paper.amount * (1 + (paper.history || []).length);
      if (!paper.done && paper.dueDate && (!next || paper.dueDate < next.dueDate)) next = paper;
    }
    const parts = [thing.papers.length + (thing.papers.length > 1 ? ' papiers' : ' papier')];
    if (cents > 0) parts.push(formatAmount(cents) + ' en tout');
    let nextInfo = null;
    if (next) {
      const due = dueInfo(next);
      nextInfo = {
        text: (due.level ? due.text : 'Prochaine échéance le ' + formatDueDate(parseDay(next.dueDate))) + ' · ' + next.organisation,
        level: due.level,
      };
    }
    return { summary: parts.join(' · '), next: nextInfo };
  }

  function renderThingCard() {
    const thing = view.page === 'thing' && things.find((candidate) => candidate.key === view.thing);
    els.thingCard.hidden = !thing;
    if (!thing) return;
    els.thingName.textContent = thing.name;
    const stats = thingStats(thing);
    els.thingStats.textContent = stats.next ? stats.summary + ' · ' + stats.next.text.split(' · ')[0].toLowerCase() : stats.summary;
  }

  /* ---------- Pages : papiers, objets, un objet ---------- */

  // La page est inscrite dans l'adresse (« #objets », « #objet=clio ») : le
  // bouton Retour du téléphone ramène à la page précédente.
  function routeHash(page, key) {
    if (page === 'things') return '#objets';
    if (page === 'thing') return '#objet=' + encodeURIComponent(key);
    return '';
  }

  function setRoute(page, key, replace) {
    view.page = page;
    view.thing = page === 'thing' ? key : '';
    const hash = routeHash(page, key);
    if (location.hash !== hash) {
      const url = location.pathname + location.search + hash;
      if (replace) history.replaceState(null, '', url);
      else history.pushState(null, '', url);
    }
  }

  function goTo(page, key) {
    if (view.page === page && view.thing === (key || '')) return;
    setRoute(page, key || '', false);
    closeRename();
    // Sur ordinateur, la fiche ouverte à droite appartient à la page quittée.
    if (els.dialog.classList.contains('as-panel')) closeSheet();
    render();
    window.scrollTo(0, 0);
  }

  // Lit la page dans l'adresse (arrivée, bouton Retour).
  function readRoute() {
    const hash = location.hash;
    if (hash === '#objets') {
      view.page = 'things';
      view.thing = '';
    } else if (hash.startsWith('#objet=')) {
      view.page = 'thing';
      try {
        view.thing = decodeURIComponent(hash.slice(7));
      } catch (error) {
        view.page = 'things';
        view.thing = '';
      }
    } else if (!hash.startsWith('#papier=')) {
      view.page = 'papers';
      view.thing = '';
    }
  }

  function onRouteChange() {
    if (location.hash.startsWith('#papier=')) {
      openPaperFromAddress();
      return;
    }
    readRoute();
    closeRename();
    render();
  }

  // Ce qui n'appartient qu'à la page des papiers, ou qu'aux objets.
  function renderPage() {
    const papersPage = view.page === 'papers';
    els.tabPapers.setAttribute('aria-pressed', String(papersPage));
    els.tabThings.setAttribute('aria-pressed', String(!papersPage));
    els.thingsPage.hidden = view.page !== 'things';
    if (!papersPage) {
      els.summary.hidden = true;
      els.backupReminder.hidden = true;
      els.toolbar.hidden = true;
      els.empty.hidden = true;
      els.noResult.hidden = true;
    }
  }

  // Renommer un objet : tous ses papiers changent de nom d'objet.
  function openRename() {
    const thing = things.find((candidate) => candidate.key === view.thing);
    if (!thing) return;
    els.thingRenameInput.value = thing.name;
    els.thingRename.hidden = false;
    els.thingActions.hidden = true;
    els.thingRenameInput.focus();
    els.thingRenameInput.select();
  }

  function closeRename() {
    els.thingRename.hidden = true;
    els.thingActions.hidden = false;
  }

  async function renameThing(event) {
    event.preventDefault();
    const thing = things.find((candidate) => candidate.key === view.thing);
    const name = cleanThing(els.thingRenameInput.value);
    if (!thing || !name) {
      els.thingRenameInput.focus();
      return;
    }
    try {
      const now = new Date().toISOString();
      for (const paper of thing.papers) await PaperStore.update(paper.id, { thing: name, updatedAt: now });
      setRoute('thing', thingKey(name), true);
      closeRename();
      await refresh();
      showToast('Objet renommé « ' + name + ' ».');
    } catch (error) {
      console.error(error);
      showToast("Le changement n'a pas pu être enregistré.");
    }
  }

  function render() {
    const total = papers.length;
    const pending = papers.filter(Reminders.needsAction).length;

    els.empty.hidden = total > 0;
    els.toolbar.hidden = total === 0;
    els.count.textContent =
      total === 0 ? '' : pending === 0 ? 'Tout traité' : pending + ' à traiter';
    els.searchClear.hidden = els.search.value === '';
    renderThings();
    renderFilters();
    renderSummary(pending);
    renderBell();
    renderMenuDot();

    const visible = papers.filter(matchesView);
    const todo = visible.filter(Reminders.needsAction).sort(compareTodo);
    const auto = visible.filter(isAutoPaid).sort(compareTodo);
    const done = visible.filter((paper) => paper.done).sort(compareDone);

    els.todoSection.hidden = todo.length === 0;
    els.autoSection.hidden = auto.length === 0;
    els.doneSection.hidden = done.length === 0;
    // S'il n'y a que des papiers à traiter, l'intertitre « À traiter » est inutile.
    els.todoTitle.hidden = pending === total;
    els.todoCount.textContent = todo.length;
    els.autoCount.textContent = auto.length;
    els.doneCount.textContent = done.length;
    els.todoList.replaceChildren(...todo.map(renderPaper));
    els.autoList.replaceChildren(...auto.map(renderPaper));
    els.doneList.replaceChildren(...done.map(renderPaper));
    els.noResult.hidden = total === 0 || visible.length > 0;
    renderPage();

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

  // Un prélèvement automatique dont la date est passée avance tout seul à
  // l'échéance suivante. Renvoie vrai si une fiche a changé.
  async function rollAutoPayments(list) {
    let changed = false;
    for (const paper of list) {
      if (!isAutoPaid(paper) || Reminders.daysUntil(paper.dueDate) >= 0) continue;
      const due = Reminders.currentDue(paper.dueDate, paper.repeat, paper.repeatDay);
      if (due === paper.dueDate) continue;
      await PaperStore.update(paper.id, { dueDate: due, updatedAt: new Date().toISOString() });
      changed = true;
    }
    return changed;
  }

  async function refresh() {
    papers = await PaperStore.list();
    if (await rollAutoPayments(papers)) papers = await PaperStore.list();

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
    if (view.page !== 'papers') setRoute('papers', '', false);
    view.query = '';
    view.category = 'all';
    view.regular = false;
    view.thing = '';
    els.search.value = '';
    render();
  }

  function markSelection() {
    for (const row of els.main.querySelectorAll('.paper')) {
      const selected = Boolean(sheet && sheet.mode === 'edit' && sheet.paper.id === row.dataset.id);
      row.classList.toggle('is-selected', selected);
    }
  }

  function findRow(id) {
    return [...els.main.querySelectorAll('.paper')].find((row) => row.dataset.id === id) || null;
  }

  // Amène à l'écran le papier qu'on vient d'ajouter ou de modifier, quitte à
  // lever la recherche et le filtre s'ils le cachent, et le signale un instant.
  function reveal(id) {
    const paper = papers.find((candidate) => candidate.id === id);
    if (!paper) return;
    if (!matchesView(paper)) {
      // Sur les pages des objets, on reste où l'on est (le papier a quitté l'objet).
      if (view.page !== 'papers') return;
      resetView();
    }
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
  function showToast(message, action, label, delay) {
    els.toastText.textContent = message;
    els.toastAction.hidden = !action;
    els.toastAction.textContent = label || 'Annuler';
    toastAction = action || null;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, delay || TOAST_DELAY);
  }

  /* ---------- Remise d'un fichier à l'utilisateur ---------- */

  // Télécharge le fichier. Dans une application installée sur iPhone, le
  // téléchargement n'existe pas : on passe par la feuille de partage, qui
  // propose « Enregistrer dans Fichiers ». Renvoie false si le navigateur
  // exige un nouveau geste de l'utilisateur pour le faire.
  async function saveFile(blob, name) {
    if (navigator.standalone === true && navigator.canShare) {
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return true;
        } catch (error) {
          if (error && error.name === 'AbortError') return true; // feuille refermée par l'utilisateur
          if (error && error.name === 'NotAllowedError') return false;
          // Autre échec : on tente le téléchargement ordinaire.
        }
      }
    }
    const url = URL.createObjectURL(blob);
    const link = el('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  }

  /* ---------- Traité / à traiter ---------- */

  // Enregistre l'état « traité » d'un papier, avec d'éventuels autres champs.
  // `announce` affiche un message qui permet d'annuler.
  async function saveDone(paper, done, extraFields, announce) {
    // Une échéance qui revient, une fois traitée, passe à la suivante au lieu
    // de rejoindre les papiers traités.
    const merged = Object.assign({}, paper, extraFields);
    if (done && !merged.autoPay) {
      const next = Reminders.nextDue(merged.dueDate, merged.repeat, merged.repeatDay);
      if (next) return advanceRegular(paper, merged, extraFields, next, announce);
    }
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

  async function advanceRegular(paper, merged, extraFields, next, announce) {
    const now = new Date().toISOString();
    const before = {
      dueDate: merged.dueDate,
      reminded: merged.reminded || {},
      history: merged.history || [],
      updatedAt: now,
    };
    const history = before.history.concat({ due: merged.dueDate, doneAt: now }).slice(-HISTORY_MAX);
    await PaperStore.update(
      paper.id,
      Object.assign({}, extraFields, { dueDate: next, reminded: Reminders.armed(next), history, updatedAt: now })
    );
    await refresh();
    if (!announce) return;
    showToast(
      '« ' + merged.organisation + ' » est traité. Prochaine échéance le ' + formatDueDate(parseDay(next)) + '.',
      async () => {
        try {
          await PaperStore.update(paper.id, before);
          await refresh();
        } catch (error) {
          reportDoneError(error);
        }
      },
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
      .register('sw.js', { updateViaCache: 'none' })
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
    els.sideBellDot.hidden = !attention;
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
        icon: Reminders.ICON,
      });
      els.remindersFeedback.textContent = "Notification d'essai envoyée.";
    } catch (error) {
      console.error(error);
      els.remindersFeedback.textContent = "La notification n'a pas pu être affichée.";
    }
  }

  // Après l'enregistrement d'une date limite : propose d'activer les
  // notifications, ou confirme les rappels si elles le sont déjà.
  function offerReminders(paper) {
    if (!paper || paper.done || Reminders.upcoming([paper]).length === 0) return;
    const state = notificationState();
    if (state === 'default') {
      showToast('Être prévenu 7 jours avant et la veille ?', enableNotifications, 'Activer');
    } else if (state === 'granted') {
      showToast('Rappels prévus 7 jours avant et la veille.');
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
    // On ne remplace pas une feuille ouverte par-dessus la liste : une saisie
    // est peut-être en cours. Le volet de droite, lui, change de papier.
    const busySheet = els.dialog.open && !els.dialog.classList.contains('as-panel');
    if (paper && !busySheet) openEdit(paper);
  }

  /* ---------- Sauvegarde ---------- */

  // Le navigateur garde la trace de la dernière sauvegarde : { at, count }.
  function lastBackup() {
    try {
      const saved = JSON.parse(localStorage.getItem(BACKUP_KEY));
      return saved && typeof saved.at === 'string' ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function rememberBackup(count) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), count }));
    } catch (error) {
      // Réglage non enregistré : sans conséquence sur la sauvegarde elle-même.
    }
  }

  function addedSince(backup) {
    return backup ? papers.filter((paper) => paper.createdAt > backup.at).length : papers.length;
  }

  // Une sauvegarde est conseillée quand des papiers ont été ajoutés depuis
  // la dernière, et qu'elle date (ou n'a jamais été faite).
  function backupAdvised() {
    const backup = lastBackup();
    if (papers.length < BACKUP_MIN_PAPERS || addedSince(backup) === 0) return false;
    return !backup || Date.now() - Date.parse(backup.at) > BACKUP_MAX_AGE;
  }

  // Encadré en haut de la liste quand une sauvegarde est conseillée, sauf si
  // l'utilisateur a choisi « Plus tard » il y a moins de 7 jours.
  function renderBackupReminder(advised) {
    let snoozed = false;
    try {
      snoozed = Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0);
    } catch (error) {
      snoozed = false;
    }
    els.backupReminder.hidden = !advised || snoozed || view.page !== 'papers';
    if (els.backupReminder.hidden) return;
    const backup = lastBackup();
    const added = addedSince(backup);
    els.backupReminderText.textContent = backup
      ? 'Dernière sauvegarde il y a ' +
        Math.floor((Date.now() - Date.parse(backup.at)) / 86400000) +
        ' jours, ' + plural(added, 'papier ajouté', 'papiers ajoutés') + ' depuis. ' +
        "Si ce téléphone est perdu, ils le seront aussi."
      : "Vos papiers n'existent que sur ce téléphone. Une sauvegarde les protège s'il est perdu ou changé.";
  }

  function snoozeBackupReminder() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    } catch (error) {
      // Rien de grave : l'encadré reviendra au prochain affichage.
    }
    els.backupReminder.hidden = true;
  }

  function renderMenuDot() {
    const advised = backupAdvised();
    renderBackupReminder(advised);
    els.menuDot.hidden = !advised;
    els.sideMenuDot.hidden = !advised;
    els.menuButton.setAttribute(
      'aria-label',
      advised ? 'Sauvegarde et installation : sauvegarde conseillée' : 'Sauvegarde et installation'
    );
  }

  const plural = (count, one, many) => count + ' ' + (count > 1 ? many : one);

  function renderBackup() {
    const total = papers.length;
    const backup = lastBackup();
    let summary;
    if (total === 0) {
      summary = 'Aucun papier à sauvegarder pour l\'instant.';
    } else {
      const size = papers.reduce((sum, paper) => sum + (paper.size || 0), 0);
      summary = plural(total, 'papier', 'papiers') + ' sur cet appareil, ' + formatSize(size) + '. ';
      if (!backup) {
        summary += 'Aucune sauvegarde n\'a encore été faite.';
      } else {
        summary +=
          'Dernière sauvegarde le ' +
          Reminders.formatDay(formats.long, new Date(backup.at)) +
          '.';
        const added = addedSince(backup);
        if (added > 0) {
          summary += ' ' + plural(added, 'papier ajouté', 'papiers ajoutés') + ' depuis.';
        }
      }
    }
    els.backupSummary.textContent = summary;
    els.backupExport.textContent = pendingBackup ? 'Enregistrer le fichier' : 'Exporter une sauvegarde';
    els.backupExport.disabled = backupBusy || total === 0;
    els.backupImport.disabled = backupBusy;
    els.backupImport.parentElement.classList.toggle('is-disabled', backupBusy);
  }

  function setBackupBusy(value, message) {
    backupBusy = value;
    if (message !== undefined) els.backupFeedback.textContent = message;
    renderBackup();
  }

  async function deliverBackup() {
    const delivered = await saveFile(pendingBackup.blob, pendingBackup.name);
    if (!delivered) {
      // Le navigateur veut un nouveau geste : le bouton devient « Enregistrer le fichier ».
      els.backupFeedback.textContent = 'Sauvegarde prête. Toucher « Enregistrer le fichier ».';
      renderBackup();
      return;
    }
    rememberBackup(pendingBackup.count);
    els.backupFeedback.textContent =
      'Sauvegarde créée : ' +
      plural(pendingBackup.count, 'papier', 'papiers') +
      ', ' +
      formatSize(pendingBackup.blob.size) +
      '.';
    pendingBackup = null;
    renderBackup();
    renderMenuDot();
  }

  async function exportBackup() {
    if (backupBusy) return;
    if (pendingBackup) {
      await deliverBackup();
      return;
    }
    setBackupBusy(true, 'Préparation de la sauvegarde…');
    try {
      pendingBackup = await Backup.exportAll();
      setBackupBusy(false);
      await deliverBackup();
    } catch (error) {
      console.error(error);
      pendingBackup = null;
      setBackupBusy(false, 'La sauvegarde a échoué. Réessayer.');
    }
  }

  async function importBackup(file) {
    if (backupBusy) return;
    setBackupBusy(true, 'Restauration en cours…');
    let message;
    try {
      const result = await Backup.restore(
        file,
        CATEGORIES.map((category) => category.id)
      );
      const parts = [];
      if (result.added > 0) {
        parts.push(plural(result.added, 'papier restauré', 'papiers restaurés') + '.');
      }
      if (result.existing > 0) {
        parts.push(
          result.added === 0 && result.failed === 0
            ? 'Tous les papiers de cette sauvegarde sont déjà là.'
            : plural(result.existing, 'était déjà là', 'étaient déjà là') + '.'
        );
      }
      if (result.failed > 0) {
        parts.push(plural(result.failed, 'papier n\'a pas pu être relu', 'papiers n\'ont pas pu être relus') + '.');
      }
      message = parts.join(' ') || 'Cette sauvegarde ne contient aucun papier.';
    } catch (error) {
      if (error && error.name === 'BackupFormatError') {
        message = error.message; // mauvais fichier choisi : rien d'anormal
      } else {
        console.error(error);
        message =
          error && error.name === 'QuotaExceededError'
            ? 'Il n\'y a plus assez de place sur cet appareil pour tout restaurer.'
            : 'La restauration a échoué. Réessayer.';
      }
    }
    try {
      await refresh();
    } catch (error) {
      console.error(error);
    }
    setBackupBusy(false, message);
  }

  /* ---------- Installation ---------- */

  function isInstalled() {
    return (
      navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    );
  }

  function isApple() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  function renderInstall() {
    let status;
    if (isInstalled()) {
      status = 'L\'application est installée sur cet appareil. Elle s\'ouvre même sans connexion.';
    } else if (location.protocol === 'file:' || !window.isSecureContext) {
      status =
        'L\'installation demande une adresse web sécurisée (https). Elle sera possible une fois l\'application mise en ligne.';
    } else if (installPrompt) {
      status =
        'Une fois installée, l\'application a son icône sur l\'écran d\'accueil et s\'ouvre même sans connexion.';
    } else if (isApple()) {
      status =
        'Sur iPhone ou iPad : ouvrir cette page dans Safari, toucher le bouton Partager, puis « Sur l\'écran d\'accueil ».';
    } else {
      status =
        'Pour l\'installer, ouvrir le menu du navigateur et choisir « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».';
    }
    els.installStatus.textContent = status;
    els.installButton.hidden = !installPrompt || isInstalled();
  }

  async function install() {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    try {
      prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.error(error);
    }
    renderInstall();
  }

  /* ---------- Apparence ---------- */

  function savedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#161a22' : '#f3eee4';
    const radio = document.querySelector('#theme-choice input[value="' + theme + '"]');
    if (radio) radio.checked = true;
  }

  function chooseTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      // Réglage non gardé : il s'applique quand même jusqu'à la fermeture.
    }
    applyTheme(theme);
  }

  function openSettings() {
    els.backupFeedback.textContent = pendingBackup
      ? 'Sauvegarde prête. Toucher « Enregistrer le fichier ».'
      : '';
    renderBackup();
    renderInstall();
    if (!els.settingsDialog.open) els.settingsDialog.showModal();
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
    setFieldError(els.noteError, els.note, false);
    setFieldError(els.amountError, els.amount, false);
    setFieldError(els.dueRequiredError, null, false);
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
      // Seul un PDF est affiché par le navigateur. Tout autre fichier est
      // téléchargé : on n'exécute jamais dans l'application un fichier venu
      // d'ailleurs (une page web glissée parmi les papiers, par exemple).
      const pdf = type === 'application/pdf';
      els.previewFileLabel.textContent = pdf ? 'Ouvrir le PDF' : 'Télécharger le fichier';
      if (pdf) {
        els.previewFile.removeAttribute('download');
        els.previewFile.target = '_blank';
      } else {
        els.previewFile.download = previewFileName();
        els.previewFile.removeAttribute('target');
      }
      if (sheet && sheet.fileUrl) els.previewFile.href = sheet.fileUrl;
    }
  }

  function previewFileName() {
    if (!sheet) return 'papier';
    const name = sheet.mode === 'edit' ? sheet.paper.fileName : sheet.file && sheet.file.name;
    return name || 'papier';
  }

  /* ---------- Feuille d'un papier : ouverture ---------- */

  function resetForm() {
    els.form.reset();
    clearErrors();
    els.deleteConfirm.hidden = true;
    els.deleteButton.hidden = false;
    setBusy(false);
  }

  // « Rappels 7 jours avant et la veille », sous la date limite, dès qu'une
  // date est saisie pour un papier à traiter.
  function renderReminderRow() {
    const repeat = Number(els.repeat.value) || 0;
    const autoPay = repeat > 0 && els.autopay.checked;
    els.autopayRow.hidden = repeat === 0;
    els.reminderRow.hidden = !(
      sheet &&
      !(sheet.mode === 'edit' && sheet.paper.done) &&
      els.dueDate.value !== ''
    );
    if (autoPay) {
      els.reminderRow.textContent = 'Pas de rappel : la date passe seule à l\'échéance suivante.';
    } else if (repeat > 0) {
      els.reminderRow.textContent =
        'Rappels 7 jours avant et la veille. Une fois traitée, la date passe à l\'échéance suivante.';
    } else {
      els.reminderRow.textContent = 'Rappels 7 jours avant et la veille.';
    }
    renderDoneToggle();
  }

  // Jour du mois d'origine d'une échéance qui revient : gardé tant que la
  // date n'est pas changée à la main (voir Reminders.nextDue).
  function repeatDayFor(dueValue) {
    const paper = sheet && sheet.mode === 'edit' ? sheet.paper : null;
    if (paper && paper.dueDate === dueValue && paper.repeatDay) return paper.repeatDay;
    const date = parseDay(dueValue);
    return date ? date.getDate() : null;
  }

  // Le bouton du bas de la fiche dit ce qu'il va faire.
  function renderDoneToggle() {
    if (!sheet || sheet.mode !== 'edit') return;
    const paper = sheet.paper;
    const repeat = Number(els.repeat.value) || 0;
    let label = 'Marquer comme traité';
    if (paper.done) {
      label = 'Remettre à traiter';
    } else if (repeat > 0 && els.autopay.checked) {
      label = 'Arrêter : ne revient plus';
    } else if (repeat > 0) {
      const next = Reminders.nextDue(els.dueDate.value, repeat, repeatDayFor(els.dueDate.value));
      if (next) label = 'Traité · prochaine le ' + formatDueDate(parseDay(next));
    }
    els.doneToggle.textContent = label;
  }

  // Une note sans document : pas d'aperçu ni de pages, la note devient le
  // champ principal (obligatoire).
  function setNoteOnly(on) {
    if (sheet) sheet.noteOnly = on;
    // La note est le premier champ d'une note sans document ; pour un papier
    // avec document, elle s'ouvre en bas, sous « + Note ».
    if (on) els.form.insertBefore(els.noteField, els.categoryField);
    else els.moreRow.after(els.noteField);
    els.pagesBlock.hidden = on;
    els.noteOptional.hidden = on;
    showNoteField(on || els.note.value.trim() !== '');
    if (on) {
      // L'aperçu d'un document n'a pas lieu d'être ; il revient avec showPreview().
      els.previewOpen.hidden = true;
      els.previewFile.hidden = true;
    }
  }

  // Pour un papier avec document, la note est repliée derrière « + Ajouter
  // une note », pour que le bouton d'enregistrement reste visible sans
  // faire défiler sur un téléphone.
  function showNoteField(open) {
    els.noteField.hidden = !open;
    els.noteToggle.hidden = open;
    els.noteToggle.setAttribute('aria-expanded', String(open));
    renderMoreRow();
  }

  function renderMoreRow() {
    els.moreRow.hidden = els.noteToggle.hidden && els.moneyToggle.hidden && els.thingToggle.hidden;
  }

  // L'objet concerné, replié comme la note et le montant.
  function showThing(open) {
    els.thingField.hidden = !open;
    els.thingToggle.hidden = open;
    els.thingToggle.setAttribute('aria-expanded', String(open));
    renderMoreRow();
  }

  // Montant et échéance qui revient : repliés derrière un lien tant qu'ils
  // sont vides, pour la même raison que la note.
  function showMoney(open) {
    els.moneyBlock.hidden = !open;
    els.moneyToggle.hidden = open;
    els.moneyToggle.setAttribute('aria-expanded', String(open));
    renderMoreRow();
  }

  function chooseNote() {
    if (!sheet || sheet.mode !== 'add') return;
    els.sheetError.hidden = true;
    releaseFileUrl();
    sheet.file = null;
    setNoteOnly(true);
    els.previewCaption.textContent = 'Note sans document';
    showStep('form');
    els.note.focus();
  }

  function showStep(step) {
    els.stepChoose.hidden = step !== 'choose';
    els.form.hidden = step !== 'form';
  }

  // Sur ordinateur, la fiche d'un papier s'affiche dans le volet de droite,
  // sans masquer la liste ; partout ailleurs, c'est une feuille par-dessus.
  function showSheet(asPanel) {
    els.dialog.classList.toggle('as-panel', asPanel);
    if (asPanel) els.dialog.show();
    else els.dialog.showModal();
  }

  // Le navigateur annonce la fermeture un instant après : si un autre papier
  // s'ouvre aussitôt (volet de droite), cette annonce tardive ne doit pas
  // effacer le nouveau. Le ménage est donc fait tout de suite.
  function closeSheet() {
    if (els.dialog.open) els.dialog.close();
    cleanUpSheet();
  }

  function cleanUpSheet() {
    releasePages();
    releaseFileUrl();
    sheet = null;
    els.dialog.classList.remove('as-panel');
    markSelection();
  }

  function openAdd() {
    closeSheet();
    sheet = { mode: 'add', file: null, fileUrl: null, pages: [], removedPages: [], noteOnly: false };
    renderPages();
    resetForm();
    setNoteOnly(false);
    els.dialogTitle.textContent = 'Nouveau papier';
    els.saveButton.textContent = 'Ajouter';
    els.changeButton.hidden = false;
    els.doneStatus.hidden = true;
    els.repeatHistory.hidden = true;
    showMoney(false);
    showThing(false);
    els.doneToggle.hidden = true;
    els.deleteZone.hidden = true;
    renderReminderRow();
    // Depuis la page d'un objet, le nouveau papier lui est déjà rattaché.
    const thing = view.page === 'thing' && things.find((candidate) => candidate.key === view.thing);
    if (thing) {
      els.thing.value = thing.name;
      showThing(true);
    }
    showStep('choose');
    showSheet(false);
  }

  function onFilePicked(file) {
    if (!sheet || sheet.mode !== 'add') return;
    els.sheetError.hidden = true;
    if (file.size === 0) {
      showSheetError('Ce fichier est vide. En choisir un autre.');
      return;
    }
    releaseFileUrl();
    setNoteOnly(false);
    sheet.file = file;
    sheet.fileUrl = URL.createObjectURL(file);
    els.previewCaption.textContent = kindLabel(file.type) + ' · ' + formatSize(file.size);
    showPreview(file.type, sheet.fileUrl, true);
    showStep('form');
  }

  async function openEdit(paper) {
    closeSheet();
    const current = { mode: 'edit', paper, fileUrl: null, pages: [], removedPages: [], noteOnly: false };
    sheet = current;
    resetForm();
    els.note.value = paper.note || '';
    setNoteOnly(Boolean(paper.noFile));
    els.dialogTitle.textContent = 'Détails du papier';
    els.saveButton.textContent = 'Enregistrer';
    els.changeButton.hidden = true;
    els.deleteZone.hidden = false;

    els.doneToggle.hidden = false;
    els.amount.value = amountForInput(paper.amount);
    els.repeat.value = String(REPEATS[paper.repeat] ? paper.repeat : 0);
    els.autopay.checked = Boolean(paper.autoPay);
    showMoney(typeof paper.amount === 'number' || els.repeat.value !== '0');
    els.thing.value = paper.thing || '';
    showThing(Boolean(paper.thing));
    const history = paper.history || [];
    els.repeatHistory.hidden = history.length === 0;
    if (history.length > 0) {
      const last = Reminders.formatDay(formats.long, new Date(history[history.length - 1].doneAt));
      els.repeatHistory.textContent =
        (history.length > 1 ? 'Déjà traitée ' + history.length + ' fois, la dernière le ' : 'Déjà traitée le ') +
        last + '.';
    }
    els.doneStatus.hidden = !paper.done;
    els.doneStatus.textContent = paper.doneAt
      ? 'Traité le ' + Reminders.formatDay(formats.long, new Date(paper.doneAt))
      : 'Traité';

    const radio = els.categoryChips.querySelector('input[value="' + paper.category + '"]');
    if (radio) radio.checked = true;
    els.organisation.value = paper.organisation;
    els.dueDate.value = paper.dueDate || '';
    renderReminderRow();
    const added = Reminders.formatDay(formats.long, new Date(paper.createdAt));
    els.previewCaption.textContent = paper.noFile
      ? 'Note sans document · ajoutée le ' + added
      : kindLabel(paper.type) + ' · ' + formatSize(paper.size) + ' · ajouté le ' + added;

    // En attendant le fichier, on montre la vignette.
    if (!paper.noFile) showPreview(paper.type, thumbnailUrl(paper), false);
    showStep('form');
    showSheet(WIDE.matches);
    markSelection();
    if (paper.noFile) return;

    try {
      const file = await PaperStore.getFile(paper.id);
      if (sheet !== current) return; // la feuille a été refermée entre-temps
      if (!file) throw new Error('Fichier introuvable');
      current.fileUrl = URL.createObjectURL(file);
      showPreview(paper.type, current.fileUrl, true);
      const pages = await PaperStore.getPages(paper);
      if (sheet !== current) return;
      current.pages = pages.map((page) => ({ key: page.key, blob: page.blob, url: URL.createObjectURL(page.blob) }));
      renderPages();
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

    const amount = parseAmount(els.amount.value);
    const amountInvalid = Number.isNaN(amount);
    const repeat = REPEATS[els.repeat.value] ? Number(els.repeat.value) : 0;
    // Une échéance qui revient a forcément une date.
    const dueMissing = repeat > 0 && dueValue === '' && !dueIncomplete;
    setFieldError(els.amountError, els.amount, amountInvalid);
    setFieldError(els.dueRequiredError, els.dueDate, dueMissing);

    const note = els.note.value.trim().slice(0, 2000);
    const noteMissing = Boolean(sheet && sheet.noteOnly) && !note;
    setFieldError(els.noteError, els.note, noteMissing);
    setFieldError(els.categoryError, null, !checked);
    setFieldError(els.organisationError, els.organisation, !organisation);
    setFieldError(els.dueDateError, els.dueDate, dueIncomplete);
    if (dueMissing) els.dueDate.setAttribute('aria-invalid', 'true');

    // Si la date limite change, les rappels repartent de zéro pour la
    // nouvelle date (sans prévenir d'une échéance qu'on vient de saisir).
    const previous = sheet && sheet.mode === 'edit' ? sheet.paper.dueDate : undefined;
    const reminded = (dueValue || null) !== previous ? Reminders.armed(dueValue) : undefined;

    if (noteMissing) {
      els.note.focus();
      return null;
    }
    if (!checked) {
      els.categoryChips.querySelector('input').focus();
      return null;
    }
    if (!organisation) {
      els.organisation.focus();
      return null;
    }
    if (dueIncomplete || dueMissing) {
      els.dueDate.focus();
      return null;
    }
    if (amountInvalid) {
      els.amount.focus();
      return null;
    }
    const fields = {
      category: checked.value,
      organisation,
      dueDate: dueValue || null,
      note,
      amount,
      repeat,
      repeatDay: repeat > 0 ? repeatDayFor(dueValue) : null,
      autoPay: repeat > 0 && els.autopay.checked,
      thing: cleanThing(els.thing.value),
    };
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
        const prepared = sheet.noteOnly
          ? { blob: null, type: '', fileName: '', thumbnail: null }
          : await prepareFile(sheet.file);
        await PaperStore.add(
          Object.assign(fields, {
            id,
            done: false,
            doneAt: null,
            fileName: prepared.fileName,
            type: prepared.type,
            size: prepared.blob ? prepared.blob.size : 0,
            noFile: Boolean(sheet.noteOnly),
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
      await savePageChanges(id);
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
      await savePageChanges(paper.id);
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

  /* ---------- Pages suivantes ---------- */

  // Les pages en plus de la première : celles déjà enregistrées (`key`) et
  // celles ajoutées dans la feuille (`isNew`), enregistrées avec « Ajouter » ou
  // « Enregistrer ». Une page retirée l'est aussi à l'enregistrement.
  function renderPages() {
    const pages = sheet ? sheet.pages : [];
    els.pagesList.replaceChildren(
      ...pages.map((page, index) => {
        const number = index + 2;
        const tile = el('div', 'page');
        let open;
        if (isImage(page.blob.type)) {
          open = el('button', 'page-open');
          open.type = 'button';
          const image = el('img');
          image.src = page.url;
          image.alt = '';
          open.append(image);
          open.addEventListener('click', () => openViewer(page.url, number));
        } else {
          open = el('a', 'page-open', page.blob.type === 'application/pdf' ? 'PDF' : 'Fichier');
          open.href = page.url;
          if (page.blob.type === 'application/pdf') open.target = '_blank';
          else open.download = 'page-' + number;
        }
        open.setAttribute('aria-label', 'Voir la page ' + number);
        const label = el('span', 'page-number', String(number));
        label.setAttribute('aria-hidden', 'true');
        const remove = el('button', 'page-remove', '×');
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Retirer la page ' + number);
        remove.addEventListener('click', () => {
          if (page.key) sheet.removedPages.push(page.key);
          URL.revokeObjectURL(page.url);
          sheet.pages = sheet.pages.filter((candidate) => candidate !== page);
          renderPages();
        });
        tile.append(open, label, remove);
        return tile;
      })
    );
  }

  function releasePages() {
    if (!sheet) return;
    for (const page of sheet.pages || []) URL.revokeObjectURL(page.url);
    sheet.pages = [];
  }

  // Enregistre les pages ajoutées ou retirées dans la feuille.
  async function savePageChanges(id) {
    if (!sheet) return;
    for (const key of sheet.removedPages) await PaperStore.removePage(id, key);
    for (const page of sheet.pages) {
      if (!page.isNew) continue;
      const prepared = await prepareFile(page.blob);
      await PaperStore.addPage(id, prepared.blob);
    }
  }

  function openViewer(url, pageNumber) {
    const src = typeof url === 'string' ? url : sheet && sheet.fileUrl;
    if (!src) return;
    const name = els.organisation.value.trim() || els.dialogTitle.textContent;
    const title = typeof pageNumber === 'number' ? name + ' · page ' + pageNumber : name;
    els.viewerImage.src = src;
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
  applyTheme(savedTheme());
  document.getElementById('theme-choice').addEventListener('change', (event) => {
    if (event.target.name === 'theme') chooseTheme(event.target.value);
  });

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
    view.regular = false;
    view.thing = '';
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
  els.note.addEventListener('input', () => setFieldError(els.noteError, els.note, false));
  els.noteChoice.addEventListener('click', chooseNote);
  els.noteToggle.addEventListener('click', () => {
    showNoteField(true);
    els.note.focus();
  });
  els.organisation.addEventListener('input', () =>
    setFieldError(els.organisationError, els.organisation, false)
  );
  els.dueDate.addEventListener('input', () => {
    setFieldError(els.dueDateError, els.dueDate, false);
    setFieldError(els.dueRequiredError, null, false);
    renderReminderRow();
  });
  els.amount.addEventListener('input', () => setFieldError(els.amountError, els.amount, false));
  els.repeat.addEventListener('change', () => {
    setFieldError(els.dueRequiredError, null, false);
    renderReminderRow();
  });
  els.autopay.addEventListener('change', renderReminderRow);
  els.thingToggle.addEventListener('click', () => {
    showThing(true);
    els.thing.focus();
  });
  // Pages : onglets (téléphone), barre latérale (ordinateur), cartes d'objets.
  els.tabPapers.addEventListener('click', () => goTo('papers'));
  els.tabThings.addEventListener('click', () => goTo('things'));
  els.sideThingsAll.addEventListener('click', () => goTo('things'));
  els.thingBack.addEventListener('click', () => goTo('things'));
  for (const container of [els.thingsGrid, els.sideThings]) {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-thing]');
      if (button) goTo('thing', button.dataset.thing);
    });
  }
  els.thingRenameButton.addEventListener('click', openRename);
  els.thingRenameCancel.addEventListener('click', closeRename);
  els.thingRename.addEventListener('submit', renameThing);
  els.moneyToggle.addEventListener('click', () => {
    showMoney(true);
    els.amount.focus();
  });
  els.sumRegular.addEventListener('click', () => {
    view.regular = !view.regular;
    if (view.regular) {
      view.category = 'all';
      view.thing = '';
    }
    render();
  });

  els.doneToggle.addEventListener('click', onDoneToggle);
  els.deleteButton.addEventListener('click', () => showDeleteConfirm(true));
  els.deleteCancel.addEventListener('click', () => showDeleteConfirm(false));
  els.deleteYes.addEventListener('click', onDelete);

  els.previewOpen.addEventListener('click', () => openViewer());
  els.pageInput.addEventListener('change', () => {
    const file = els.pageInput.files && els.pageInput.files[0];
    els.pageInput.value = '';
    if (!file || !sheet) return;
    if (file.size === 0) {
      showSheetError('Ce fichier est vide. En choisir un autre.');
      return;
    }
    sheet.pages.push({ blob: file, url: URL.createObjectURL(file), isNew: true });
    renderPages();
  });
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
    if (!els.dialog.open) cleanUpSheet();
  });
  // Le volet de droite n'est pas une fenêtre modale : Échap le ferme quand même.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.dialog.open && els.dialog.classList.contains('as-panel')) {
      if (!els.viewer.open) els.dialog.close();
    }
  });
  // Passage d'un écran large à un écran étroit (fenêtre redimensionnée) : la
  // fiche ouverte en volet est refermée plutôt que laissée hors de l'écran.
  WIDE.addEventListener('change', () => {
    if (els.dialog.classList.contains('as-panel')) closeSheet();
  });

  // Ordinateur : barre latérale.
  els.sideNav.addEventListener('click', (event) => {
    const button = event.target.closest('.side-item');
    if (!button) return;
    view.category = button.dataset.filter;
    view.regular = false;
    if (view.page !== 'papers') {
      setRoute('papers', '', false);
      if (els.dialog.classList.contains('as-panel')) closeSheet();
      window.scrollTo(0, 0);
    }
    render();
  });
  els.sideAdd.addEventListener('click', openAdd);

  els.viewer.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) els.viewer.close();
  });
  els.viewer.addEventListener('close', () => els.viewerImage.removeAttribute('src'));

  // Rappels.
  els.bell.addEventListener('click', openReminders);
  els.sideBell.addEventListener('click', openReminders);
  els.remindersEnable.addEventListener('click', enableNotifications);
  els.remindersTest.addEventListener('click', sendTestNotification);
  els.remindersDialog.addEventListener('click', (event) => {
    if (event.target === els.remindersDialog || event.target.closest('[data-close]')) {
      els.remindersDialog.close();
    }
  });
  // Sauvegarde et installation.
  els.menuButton.addEventListener('click', openSettings);
  els.backupReminderLater.addEventListener('click', snoozeBackupReminder);
  // « Sauvegarder » ouvre la feuille de sauvegarde et lance l'export : le
  // compte rendu (ou « Enregistrer le fichier » sur iPhone) s'y affiche.
  els.backupReminderSave.addEventListener('click', () => {
    openSettings();
    exportBackup();
  });
  els.sideMenu.addEventListener('click', openSettings);
  els.backupExport.addEventListener('click', exportBackup);
  els.backupImport.addEventListener('change', () => {
    const file = els.backupImport.files && els.backupImport.files[0];
    els.backupImport.value = '';
    if (file) importBackup(file);
  });
  els.installButton.addEventListener('click', install);
  els.settingsDialog.addEventListener('click', (event) => {
    if (event.target === els.settingsDialog || event.target.closest('[data-close]')) {
      els.settingsDialog.close();
    }
  });
  // Le navigateur (Chrome, Edge) signale qu'il peut installer l'application :
  // on garde sa proposition pour notre propre bouton.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    if (els.settingsDialog.open) renderInstall();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (els.settingsDialog.open) renderInstall();
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
      if (!event.data) return;
      if (event.data.type === 'open-paper') openPaperById(event.data.id);

    });
  }

  // Au retour sur l'application (le lendemain, par exemple), « Demain »
  // doit devenir « Aujourd'hui » : on redessine la liste et on revérifie
  // les rappels.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    // Refaire la liste depuis la base : un prélèvement a pu passer de date.
    refresh().catch((error) => console.error(error));
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
  readRoute(); // arrivée directe sur « #objets » ou « #objet=… »

  refresh().then(
    async () => {
      openPaperFromAddress();
      window.addEventListener('hashchange', onRouteChange);
      window.addEventListener('popstate', onRouteChange);
      if (notificationState() === 'granted') await registerBackgroundCheck();
      checkReminders();
    },
    (error) => {
      console.error(error);
      els.storageError.hidden = false;
    }
  );
})();
