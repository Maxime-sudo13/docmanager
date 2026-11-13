/*
 * Sauvegarde de « Mes papiers » en un seul fichier, et restauration.
 *
 * Le fichier est une archive .zip ordinaire, sans compression (les photos et
 * les PDF sont déjà compressés). On peut l'ouvrir sur n'importe quel
 * ordinateur : les papiers y sont rangés tels quels dans « papiers/ », et
 * « mes-papiers.json » décrit chacun (organisme, catégorie, date limite…).
 *
 *   mes-papiers.json
 *   papiers/edf_2026-11-30_1a2b3c4d.jpg
 *   vignettes/1a2b3c4d-….jpg
 *
 * Tout se fait dans le navigateur : rien n'est envoyé nulle part.
 */
const Backup = (function () {
  'use strict';

  const FORMAT = 'mes-papiers';
  const VERSION = 1;
  const MANIFEST = 'mes-papiers.json';

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  /* ---------- Somme de contrôle (CRC-32) ---------- */

  const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /* ---------- Écriture d'une archive .zip ---------- */

  // Fabrique l'archive morceau par morceau. Chaque fichier est remis au
  // navigateur dès qu'il est ajouté, pour ne pas tout garder en mémoire vive.
  function createZip() {
    const parts = [];    // morceaux de l'archive, dans l'ordre
    const entries = [];  // ce qu'il faut redire dans le sommaire final
    let offset = 0;
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date =
      ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    function push(bytes) {
      parts.push(bytes);
      offset += bytes.byteLength;
    }

    return {
      add(name, bytes) {
        const nameBytes = encoder.encode(name);
        const crc = crc32(bytes);
        const header = new DataView(new ArrayBuffer(30));
        header.setUint32(0, 0x04034b50, true); // en-tête de fichier
        header.setUint16(4, 20, true);         // version nécessaire pour lire
        header.setUint16(6, 0x0800, true);     // noms en UTF-8
        header.setUint16(8, 0, true);          // pas de compression
        header.setUint16(10, time, true);
        header.setUint16(12, date, true);
        header.setUint32(14, crc, true);
        header.setUint32(18, bytes.byteLength, true);
        header.setUint32(22, bytes.byteLength, true);
        header.setUint16(26, nameBytes.byteLength, true);
        header.setUint16(28, 0, true);
        entries.push({ nameBytes, crc, size: bytes.byteLength, offset });
        push(new Uint8Array(header.buffer));
        push(nameBytes);
        parts.push(new Blob([bytes]));
        offset += bytes.byteLength;
      },

      finish() {
        if (entries.length > 0xffff || offset > 0xffffffff) {
          throw new Error('Sauvegarde trop volumineuse pour une archive .zip simple');
        }
        const start = offset;
        for (const entry of entries) {
          const record = new DataView(new ArrayBuffer(46));
          record.setUint32(0, 0x02014b50, true); // ligne du sommaire
          record.setUint16(4, 20, true);
          record.setUint16(6, 20, true);
          record.setUint16(8, 0x0800, true);
          record.setUint16(10, 0, true);
          record.setUint16(12, time, true);
          record.setUint16(14, date, true);
          record.setUint32(16, entry.crc, true);
          record.setUint32(20, entry.size, true);
          record.setUint32(24, entry.size, true);
          record.setUint16(28, entry.nameBytes.byteLength, true);
          record.setUint32(42, entry.offset, true);
          push(new Uint8Array(record.buffer));
          push(entry.nameBytes);
        }
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);      // fin du sommaire
        end.setUint16(8, entries.length, true);
        end.setUint16(10, entries.length, true);
        end.setUint32(12, offset - start, true);
        end.setUint32(16, start, true);
        parts.push(new Uint8Array(end.buffer));
        return new Blob(parts, { type: 'application/zip' });
      },
    };
  }

  /* ---------- Lecture d'une archive .zip ---------- */

  async function bytesOf(blob, start, end) {
    return new Uint8Array(await blob.slice(start, end).arrayBuffer());
  }

  async function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Archive compressée : ce navigateur ne sait pas la lire');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // Lit le sommaire de l'archive. Renvoie une table nom -> fonction qui lit
  // le fichier et vérifie qu'il n'est pas abîmé.
  async function openZip(blob) {
    // La fin du sommaire est dans les derniers octets du fichier.
    const tailStart = Math.max(0, blob.size - 65557);
    const tail = await bytesOf(blob, tailStart, blob.size);
    const tailView = new DataView(tail.buffer);
    let end = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tailView.getUint32(i, true) === 0x06054b50) {
        end = i;
        break;
      }
    }
    if (end < 0) throw new Error('Ce fichier n\'est pas une archive .zip');
    const count = tailView.getUint16(end + 10, true);
    const size = tailView.getUint32(end + 12, true);
    const start = tailView.getUint32(end + 16, true);
    if (start + size > blob.size) throw new Error('Archive tronquée');

    const directory = await bytesOf(blob, start, start + size);
    const view = new DataView(directory.buffer);
    const files = new Map();
    let position = 0;
    for (let i = 0; i < count; i++) {
      if (position + 46 > directory.length || view.getUint32(position, true) !== 0x02014b50) {
        throw new Error('Sommaire de l\'archive illisible');
      }
      const method = view.getUint16(position + 10, true);
      const crc = view.getUint32(position + 16, true);
      const packedSize = view.getUint32(position + 20, true);
      const nameLength = view.getUint16(position + 28, true);
      const extraLength = view.getUint16(position + 30, true);
      const commentLength = view.getUint16(position + 32, true);
      const headerOffset = view.getUint32(position + 42, true);
      const name = decoder.decode(directory.subarray(position + 46, position + 46 + nameLength));
      position += 46 + nameLength + extraLength + commentLength;

      files.set(name, async () => {
        const header = await bytesOf(blob, headerOffset, headerOffset + 30);
        const headerView = new DataView(header.buffer);
        if (header.length < 30 || headerView.getUint32(0, true) !== 0x04034b50) {
          throw new Error('Fichier introuvable dans l\'archive');
        }
        const dataStart =
          headerOffset + 30 + headerView.getUint16(26, true) + headerView.getUint16(28, true);
        const packed = await bytesOf(blob, dataStart, dataStart + packedSize);
        if (packed.length !== packedSize) throw new Error('Archive tronquée');
        let content;
        if (method === 0) content = packed;
        else if (method === 8) content = await inflate(packed);
        else throw new Error('Compression non prise en charge');
        if (crc32(content) !== crc) throw new Error('Fichier abîmé');
        return content;
      });
    }
    return files;
  }

  /* ---------- Sauvegarde ---------- */

  function slug(text) {
    return String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  function extension(paper) {
    const known = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/heic': 'heic',
      'application/pdf': 'pdf',
    };
    if (known[paper.type]) return known[paper.type];
    const match = /\.([a-z0-9]{1,8})$/i.exec(paper.fileName || '');
    return match ? match[1].toLowerCase() : 'bin';
  }

  // Un nom lisible par un humain : organisme, date, puis de quoi le rendre unique.
  function pathFor(paper) {
    const day = paper.dueDate || String(paper.createdAt || '').slice(0, 10);
    const pieces = [slug(paper.organisation) || 'papier', day, String(paper.id).slice(0, 8)];
    return 'papiers/' + pieces.filter(Boolean).join('_') + '.' + extension(paper);
  }

  function fileName(date) {
    const pad = (number) => String(number).padStart(2, '0');
    return (
      'mes-papiers-' +
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      '.zip'
    );
  }

  // Fabrique la sauvegarde de tous les papiers.
  // Renvoie { blob, name, count }.
  async function exportAll() {
    const papers = await PaperStore.list();
    const zip = createZip();
    const described = [];
    for (const paper of papers) {
      // Une note sans document n'a que sa fiche, sauvegardée dans le sommaire.
      if (paper.noFile) {
        const note = Object.assign({}, paper, { file: null, thumbnail: null });
        delete note.extraPages;
        described.push(note);
        continue;
      }
      const file = await PaperStore.getFile(paper.id);
      if (!file) continue; // fiche sans fichier : rien à sauvegarder
      const entry = Object.assign({}, paper, { file: pathFor(paper), thumbnail: null });
      delete entry.extraPages;
      zip.add(entry.file, new Uint8Array(await file.arrayBuffer()));
      // Pages suivantes : à côté de la première, « …-page-2.jpg », etc.
      const pages = await PaperStore.getPages(paper);
      if (pages.length > 0) {
        entry.pages = [];
        let number = 2;
        for (const page of pages) {
          const type = page.blob.type || '';
          const path =
            entry.file.replace(/\.[a-z0-9]+$/, '') +
            '-page-' + number + '.' + extension({ type, fileName: '' });
          zip.add(path, new Uint8Array(await page.blob.arrayBuffer()));
          entry.pages.push({ file: path, type });
          number++;
        }
      }
      if (paper.thumbnail) {
        entry.thumbnail = 'vignettes/' + paper.id + '.jpg';
        zip.add(entry.thumbnail, new Uint8Array(await paper.thumbnail.arrayBuffer()));
      }
      described.push(entry);
    }
    const now = new Date();
    const manifest = {
      format: FORMAT,
      version: VERSION,
      exportedAt: now.toISOString(),
      papers: described,
      things: await PaperStore.listThings(),
      categories: await PaperStore.listCategories(),
    };
    zip.add(MANIFEST, encoder.encode(JSON.stringify(manifest, null, 2)));
    return { blob: zip.finish(), name: fileName(now), count: described.length };
  }

  /* ---------- Restauration ---------- */

  const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const instant = (value) =>
    typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
  const day = (value) => (Reminders.parseDay(value) ? value : null);
  const THING_KINDS = ['vehicule', 'logement', 'appareil', 'autre'];

  // Une sauvegarde vient de l'extérieur : on ne reprend que les champs
  // connus, et on vérifie chacun. Renvoie null si la fiche est inutilisable.
  function cleanPaper(raw, categories) {
    if (!raw || typeof raw !== 'object') return null;
    const id = text(raw.id, 100);
    const noFile = raw.noFile === true;
    if (!id || (!noFile && typeof raw.file !== 'string')) return null;
    const now = new Date().toISOString();
    const reminded = {};
    if (raw.reminded && typeof raw.reminded === 'object') {
      if (day(raw.reminded.week)) reminded.week = raw.reminded.week;
      if (day(raw.reminded.eve)) reminded.eve = raw.reminded.eve;
    }
    const type = text(raw.type, 100);
    const done = raw.done === true;
    // Montant en centimes ; échéance qui revient tous les 1, 3, 12 ou 24 mois.
    const amount =
      Number.isInteger(raw.amount) && raw.amount >= 0 && raw.amount <= 100000000 ? raw.amount : null;
    const repeat = [1, 3, 12, 24].includes(raw.repeat) && day(raw.dueDate) && raw.keep !== true ? raw.repeat : 0;
    const repeatDay =
      repeat > 0 && Number.isInteger(raw.repeatDay) && raw.repeatDay >= 1 && raw.repeatDay <= 31
        ? raw.repeatDay
        : null;
    const history = Array.isArray(raw.history)
      ? raw.history
          .filter((entry) => entry && day(entry.due) && instant(entry.doneAt))
          .slice(-24)
          .map((entry) => ({ due: entry.due, doneAt: entry.doneAt }))
      : [];
    return {
      id,
      category: categories.includes(raw.category) ? raw.category : 'autre',
      organisation: text(raw.organisation, 80).replace(/\s+/g, ' ') || 'Sans nom',
      dueDate: day(raw.dueDate),
      done,
      doneAt: done ? instant(raw.doneAt) : null,
      reminded,
      fileName: text(raw.fileName, 255),
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 2000) : '',
      noFile,
      amount,
      repeat,
      repeatDay,
      autoPay: repeat > 0 && raw.autoPay === true,
      history,
      thing: text(raw.thing, 60).replace(/\s+/g, ' '),
      keep: raw.keep === true,
      type: /^[\w.+-]+\/[\w.+-]+$/.test(type) ? type : '',
      createdAt: instant(raw.createdAt) || now,
      updatedAt: instant(raw.updatedAt) || now,
    };
  }

  // Remet dans l'application les papiers d'une sauvegarde. Les papiers déjà
  // présents ne sont pas touchés. `categories` est la liste des identifiants
  // de catégorie admis. Renvoie { added, existing, failed }.
  async function restore(file, categories) {
    let files;
    let manifest;
    try {
      files = await openZip(file);
      const readManifest = files.get(MANIFEST);
      if (!readManifest) throw new Error('Pas de sommaire');
      manifest = JSON.parse(decoder.decode(await readManifest()));
    } catch (error) {
      const failure = new Error('Ce fichier n\'est pas une sauvegarde de « Mes papiers ».');
      failure.name = 'BackupFormatError';
      throw failure;
    }
    if (!manifest || manifest.format !== FORMAT || !Array.isArray(manifest.papers)) {
      const failure = new Error('Ce fichier n\'est pas une sauvegarde de « Mes papiers ».');
      failure.name = 'BackupFormatError';
      throw failure;
    }
    if (manifest.version > VERSION) {
      const failure = new Error(
        'Cette sauvegarde vient d\'une version plus récente de l\'application.'
      );
      failure.name = 'BackupFormatError';
      throw failure;
    }

    // Les catégories personnelles : on ajoute celles qui manquent, avant les
    // papiers qui s'y rangent.
    categories = categories.slice();
    if (Array.isArray(manifest.categories)) {
      const knownCategories = new Set((await PaperStore.listCategories()).map((category) => category.id));
      for (const raw of manifest.categories.slice(0, 200)) {
        if (!raw || typeof raw !== 'object') continue;
        const id = text(raw.id, 60);
        const label = text(raw.label, 24).replace(/\s+/g, ' ');
        const color = /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : '';
        if (!/^c-[\w-]+$/.test(id) || !label || !color) continue;
        if (!knownCategories.has(id)) {
          await PaperStore.putCategory({ id, label, color, createdAt: instant(raw.createdAt) || new Date().toISOString() });
          knownCategories.add(id);
        }
        if (!categories.includes(id)) categories.push(id);
      }
    }

    // Les objets créés à la main : on ajoute ceux qui manquent.
    if (Array.isArray(manifest.things)) {
      const knownThings = new Set((await PaperStore.listThings()).map((thing) => thing.id));
      for (const raw of manifest.things.slice(0, 1000)) {
        if (!raw || typeof raw !== 'object') continue;
        const id = text(raw.id, 100);
        const name = text(raw.name, 60).replace(/\s+/g, ' ');
        if (!id || !name || knownThings.has(id)) continue;
        await PaperStore.putThing({
          id,
          name,
          kind: THING_KINDS.includes(raw.kind) ? raw.kind : 'autre',
          createdAt: instant(raw.createdAt) || new Date().toISOString(),
        });
        knownThings.add(id);
      }
    }

    const known = new Set((await PaperStore.list()).map((paper) => paper.id));
    const result = { added: 0, existing: 0, failed: 0 };
    for (const raw of manifest.papers) {
      const paper = cleanPaper(raw, categories);
      if (!paper) {
        result.failed++;
        continue;
      }
      if (known.has(paper.id)) {
        result.existing++;
        continue;
      }
      try {
        if (paper.noFile) {
          if (!paper.note) throw new Error('Note vide');
          paper.size = 0;
          paper.thumbnail = null;
          paper.type = '';
          await PaperStore.add(paper, null);
          known.add(paper.id);
          result.added++;
          continue;
        }
        const readFile = files.get(raw.file);
        if (!readFile) throw new Error('Fichier absent de la sauvegarde');
        const content = await readFile();
        const readThumbnail = typeof raw.thumbnail === 'string' ? files.get(raw.thumbnail) : null;
        paper.size = content.byteLength;
        paper.thumbnail = null;
        if (readThumbnail) {
          try {
            paper.thumbnail = new Blob([await readThumbnail()], { type: 'image/jpeg' });
          } catch (error) {
            // Vignette abîmée : le papier est restauré sans elle.
          }
        }
        await PaperStore.add(paper, new Blob([content], { type: paper.type }));
        // Pages suivantes : une page abîmée ou absente est laissée de côté,
        // le papier est restauré avec les autres.
        if (Array.isArray(raw.pages)) {
          for (const rawPage of raw.pages.slice(0, 100)) {
            if (!rawPage || typeof rawPage.file !== 'string') continue;
            const readPage = files.get(rawPage.file);
            if (!readPage) continue;
            const type = typeof rawPage.type === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(rawPage.type) ? rawPage.type : '';
            try {
              await PaperStore.addPage(paper.id, new Blob([await readPage()], { type }));
            } catch (error) {
              if (error && error.name === 'QuotaExceededError') throw error;
            }
          }
        }
        known.add(paper.id);
        result.added++;
      } catch (error) {
        // Stockage plein : inutile de continuer, et il faut le dire.
        if (error && error.name === 'QuotaExceededError') throw error;
        result.failed++;
      }
    }
    return result;
  }

  return { exportAll, restore };
})();
