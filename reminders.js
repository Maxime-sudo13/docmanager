/*
 * Rappels de « Mes papiers » : 7 jours avant la date limite, puis la veille.
 *
 * Ce fichier est chargé par la page et par le service worker (sw.js). Il ne
 * touche donc jamais à l'affichage : il dit quels rappels sont dus, fabrique
 * leur texte et le fichier de calendrier (.ics).
 *
 * Chaque fiche retient les rappels déjà donnés dans `reminded` :
 *   { week: 'AAAA-MM-JJ', eve: 'AAAA-MM-JJ' }
 * La valeur est la date limite pour laquelle le rappel a été donné : si la
 * date limite change, les rappels repartent d'eux-mêmes.
 */
const Reminders = (function () {
  'use strict';

  const ICON = 'icons/icon-192.png';
  const WEEK_DAYS = 7;   // premier rappel : 7 jours avant
  const MAX_SEPARATE = 3; // au-delà, un seul message qui regroupe tout

  let fakeToday = null;  // jour simulé pour les essais (voir README), sinon null

  const longDay = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  /* ---------- Jours ---------- */

  // Une date limite est un jour du calendrier, « AAAA-MM-JJ », sans heure ni
  // fuseau. Renvoie null si elle est absente ou invalide.
  function parseDay(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year, month - 1, day);
    const exists =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return exists ? date : null;
  }

  // Aujourd'hui à minuit, heure de l'appareil.
  function today() {
    if (fakeToday) return new Date(fakeToday.getTime());
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Pour les essais : fait croire que nous sommes un autre jour. Renvoie le
  // jour retenu, ou null si la valeur est invalide (on reste alors à la vraie date).
  function simulateToday(value) {
    fakeToday = parseDay(value);
    return fakeToday;
  }

  // « 1er décembre », comme on l'écrit en français, et non « 1 décembre ».
  function formatDay(format, date) {
    return format.format(date).replace(/(^|\s)1(?=\s)/, '$11er');
  }

  function addDays(date, count) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
  }

  // Nombre de jours d'ici la date limite : négatif si elle est passée, null
  // s'il n'y en a pas.
  function daysUntil(dueDate) {
    const date = parseDay(dueDate);
    return date ? Math.round((date - today()) / 86400000) : null;
  }

  /* ---------- Rappels dus ---------- */

  const byName = (a, b) => a.paper.organisation.localeCompare(b.paper.organisation, 'fr');

  // Les rappels à donner maintenant. Un rappel manqué (application restée
  // fermée) est rattrapé tant que la date limite n'est pas dépassée.
  function pending(papers) {
    const result = [];
    for (const paper of papers) {
      if (paper.done) continue;
      const days = daysUntil(paper.dueDate);
      if (days === null || days < 0 || days > WEEK_DAYS) continue;
      const reminded = paper.reminded || {};
      if (days <= 1) {
        if (reminded.eve === paper.dueDate) continue;
        result.push({
          paper,
          stage: 'eve',
          days,
          reminded: { week: paper.dueDate, eve: paper.dueDate },
        });
      } else {
        if (reminded.week === paper.dueDate) continue;
        result.push({ paper, stage: 'week', days, reminded: { week: paper.dueDate } });
      }
    }
    return result.sort((a, b) => a.days - b.days || byName(a, b));
  }

  // Ce qu'il faut noter dans `reminded` quand on enregistre une date limite :
  // on ne prévient pas quelqu'un d'une échéance qu'il vient de saisir.
  function armed(dueDate) {
    const days = daysUntil(dueDate);
    if (days === null) return {};
    if (days <= 1) return { week: dueDate, eve: dueDate };
    if (days <= WEEK_DAYS) return { week: dueDate };
    return {};
  }

  // Les rappels encore à venir, du plus proche au plus lointain :
  // [{ paper, stage, date }].
  function upcoming(papers) {
    const start = today();
    const result = [];
    for (const paper of papers) {
      if (paper.done) continue;
      const due = parseDay(paper.dueDate);
      if (!due) continue;
      const reminded = paper.reminded || {};
      const week = addDays(due, -WEEK_DAYS);
      const eve = addDays(due, -1);
      if (week >= start && reminded.week !== paper.dueDate) {
        result.push({ paper, stage: 'week', date: week });
      }
      if (eve >= start && reminded.eve !== paper.dueDate) {
        result.push({ paper, stage: 'eve', date: eve });
      }
    }
    return result.sort((a, b) => a.date - b.date || byName(a, b));
  }

  /* ---------- Notifications ---------- */

  function when(days) {
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    return 'Dans ' + days + ' jours';
  }

  function message(item) {
    return {
      title: when(item.days) + ' : ' + item.paper.organisation,
      options: {
        body: 'Date limite le ' + formatDay(longDay, parseDay(item.paper.dueDate)) + '.',
        tag: 'papier-' + item.paper.id, // un seul message à la fois par papier
        data: { id: item.paper.id },
        lang: 'fr',
        icon: ICON,
      },
    };
  }

  function groupedMessage(items) {
    return {
      title: items.length + ' échéances approchent',
      options: {
        body: items
          .map((item) => item.paper.organisation + ' (' + when(item.days).toLowerCase() + ')')
          .join(', '),
        tag: 'papiers',
        data: {},
        lang: 'fr',
        icon: ICON,
      },
    };
  }

  // Donne les rappels dus, puis note qu'ils l'ont été. `notify(title, options)`
  // est fourni par l'appelant : la page et le service worker n'affichent pas
  // une notification de la même façon. Renvoie les rappels donnés.
  async function check(notify) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return [];
    const due = pending(await PaperStore.list());
    if (due.length === 0) return [];

    const batches = due.length > MAX_SEPARATE ? [due] : due.map((item) => [item]);
    const given = [];
    for (const batch of batches) {
      const { title, options } = batch.length > 1 ? groupedMessage(batch) : message(batch[0]);
      try {
        await notify(title, options);
      } catch (error) {
        continue; // pas affiché : on réessaiera à la prochaine vérification
      }
      for (const item of batch) {
        await PaperStore.update(item.paper.id, { reminded: item.reminded });
        given.push(item);
      }
    }
    return given;
  }

  /* ---------- Fichier de calendrier (.ics) ---------- */

  function icsText(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  // Une ligne ne doit pas dépasser 75 octets : au-delà, elle continue sur la
  // ligne suivante, qui commence par une espace.
  function icsFold(line) {
    const encoder = new TextEncoder();
    const parts = [];
    let current = '';
    let size = 0;
    for (const character of line) {
      const bytes = encoder.encode(character).length;
      if (size + bytes > (parts.length === 0 ? 75 : 74)) {
        parts.push(current);
        current = '';
        size = 0;
      }
      current += character;
      size += bytes;
    }
    parts.push(current);
    return parts.join('\r\n ');
  }

  const pad = (number) => String(number).padStart(2, '0');
  const icsDay = (date) => date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
  const icsInstant = (date) =>
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z';

  // Un évènement sur la journée de la date limite, avec deux alertes : 7 jours
  // avant et la veille, à 9 h. C'est l'agenda du téléphone qui prévient, même
  // si l'application n'est jamais rouverte. Renvoie null sans date limite.
  function toICS(paper, categoryLabel) {
    const due = parseDay(paper.dueDate);
    if (!due) return null;
    const name = paper.organisation;
    const stamp = new Date();
    // Numéro de version : si la date change et qu'on rajoute l'évènement,
    // l'agenda remplace l'ancien au lieu d'en créer un second.
    const sequence = Math.max(
      0,
      Math.floor((Date.parse(paper.updatedAt || paper.createdAt) - Date.UTC(2024, 0, 1)) / 1000) || 0
    );
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mes papiers//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + paper.id + '@mes-papiers',
      'DTSTAMP:' + icsInstant(stamp),
      'SEQUENCE:' + sequence,
      'DTSTART;VALUE=DATE:' + icsDay(due),
      'DTEND;VALUE=DATE:' + icsDay(addDays(due, 1)),
      'SUMMARY:' + icsText('Date limite : ' + name),
      'DESCRIPTION:' +
        icsText(
          (categoryLabel ? 'Catégorie : ' + categoryLabel + '\n' : '') +
            'Papier rangé dans « Mes papiers ».'
        ),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsText('Dans 7 jours : ' + name),
      'TRIGGER:-P6DT15H', // 7 jours avant, à 9 h
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsText('Demain : ' + name),
      'TRIGGER:-PT15H', // la veille, à 9 h
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  return {
    WEEK_DAYS,
    ICON,
    parseDay,
    today,
    simulateToday,
    formatDay,
    daysUntil,
    pending,
    armed,
    upcoming,
    check,
    toICS,
  };
})();
