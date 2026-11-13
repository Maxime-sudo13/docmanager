/*
 * Rappels de « Mes papiers » : 7 jours avant la date limite, puis la veille.
 *
 * Ce fichier est chargé par la page et par le service worker (sw.js). Il ne
 * touche donc jamais à l'affichage : il dit quels rappels sont dus et fabrique
 * leur texte.
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

  /* ---------- Échéances qui reviennent ---------- */

  // Une échéance peut revenir tous les `repeat` mois (1, 3, 12 ou 24).
  // `repeatDay` garde le jour du mois d'origine : une échéance du 31 janvier
  // passe au 28 février, puis revient au 31 mars, au lieu de glisser au 28.

  function toDay(date) {
    const pad = (number) => String(number).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  // L'échéance suivante, `AAAA-MM-JJ`, ou null si rien ne revient.
  function nextDue(dueDate, repeat, repeatDay) {
    const date = parseDay(dueDate);
    if (!date || !(repeat > 0)) return null;
    const anchor = repeatDay >= 1 && repeatDay <= 31 ? repeatDay : date.getDate();
    const month = date.getMonth() + repeat;
    const lastDay = new Date(date.getFullYear(), month + 1, 0).getDate();
    return toDay(new Date(date.getFullYear(), month, Math.min(anchor, lastDay)));
  }

  // Pour un prélèvement automatique : la première échéance à partir
  // d'aujourd'hui. Renvoie la date d'origine si elle n'est pas passée.
  function currentDue(dueDate, repeat, repeatDay) {
    let due = dueDate;
    for (let guard = 0; guard < 1200 && daysUntil(due) < 0; guard++) {
      const next = nextDue(due, repeat, repeatDay);
      if (!next) break;
      due = next;
    }
    return due;
  }

  // Un papier pour lequel on attend un geste : ni traité, ni prélevé tout
  // seul, ni simplement à conserver.
  function needsAction(paper) {
    return remindable(paper) && !paper.keep;
  }

  // Un papier dont la date mérite un rappel : à traiter, ou à conserver avec
  // une date de fin de validité (passeport, garantie).
  function remindable(paper) {
    return !paper.done && !(paper.autoPay && paper.repeat > 0);
  }

  /* ---------- Rappels dus ---------- */

  const byName = (a, b) => a.paper.organisation.localeCompare(b.paper.organisation, 'fr');

  // Les rappels à donner maintenant. Un rappel manqué (application restée
  // fermée) est rattrapé tant que la date limite n'est pas dépassée.
  function pending(papers) {
    const result = [];
    for (const paper of papers) {
      if (!remindable(paper)) continue;
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
      if (!remindable(paper)) continue;
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
        body:
          (item.paper.keep ? 'Fin de validité le ' : 'Date limite le ') +
          formatDay(longDay, parseDay(item.paper.dueDate)) +
          '.',
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

  return {
    WEEK_DAYS,
    ICON,
    parseDay,
    today,
    simulateToday,
    formatDay,
    daysUntil,
    toDay,
    nextDue,
    currentDue,
    needsAction,
    pending,
    armed,
    upcoming,
    check,
  };
})();
