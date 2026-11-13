/*
 * Accès aux données de « Mes papiers » : tout est enregistré dans IndexedDB,
 * sur l'appareil, et nulle part ailleurs.
 *
 * Trois tables :
 *   - « papers » : la fiche de chaque papier (champs + vignette) ;
 *   - « files »  : le fichier lui-même, rangé à part pour ne pas charger
 *                  toutes les photos en mémoire quand on affiche la liste ;
 *   - « things » : les objets créés à la main (voiture, logement, appareil),
 *                  qui existent même avant d'avoir un papier (version 2).
 *
 * Les fichiers sont stockés sous forme d'ArrayBuffer plutôt que de Blob :
 * c'est la forme la mieux prise en charge par tous les navigateurs.
 * Vers l'extérieur, ce module ne manipule que des Blob.
 */
const PaperStore = (function () {
  'use strict';

  const DB_NAME = 'mes-papiers';
  const DB_VERSION = 2;
  const PAPERS = 'papers';
  const FILES = 'files';
  const THINGS = 'things';

  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(PAPERS)) db.createObjectStore(PAPERS, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES, { keyPath: 'id' });
          // Version 2 : les objets. Rien à convertir, les papiers ne changent pas.
          if (!db.objectStoreNames.contains(THINGS)) db.createObjectStore(THINGS, { keyPath: 'id' });
        };
        request.onsuccess = () => {
          const db = request.result;
          // Une version plus récente de l'application s'ouvre dans un autre
          // onglet : on lui laisse la place.
          db.onversionchange = () => {
            db.close();
            dbPromise = null;
          };
          resolve(db);
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Base de données bloquée par un autre onglet'));
      });
      // Après un échec, la prochaine tentative repart de zéro.
      dbPromise.catch(() => {
        dbPromise = null;
      });
    }
    return dbPromise;
  }

  // Ouvre une transaction, laisse `work` y lancer ses requêtes, et ne rend la
  // main qu'une fois la transaction entièrement validée. `work` peut renvoyer
  // une fonction : elle est appelée à la fin pour donner le résultat.
  async function transaction(stores, mode, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      tx.oncomplete = () => resolve(typeof result === 'function' ? result() : result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Enregistrement annulé'));
      result = work(tx);
    });
  }

  // Toutes les clés « <id>#… » : les pages supplémentaires d'un papier.
  function pageRange(id) {
    return IDBKeyRange.bound(id + '#', id + '#\uffff');
  }

  function toPaper(record) {
    const paper = Object.assign({}, record);
    paper.thumbnail = record.thumbnail
      ? new Blob([record.thumbnail], { type: 'image/jpeg' })
      : null;
    return paper;
  }

  return {
    /** Toutes les fiches, sans les fichiers. */
    async list() {
      const records = await transaction(PAPERS, 'readonly', (tx) => {
        const request = tx.objectStore(PAPERS).getAll();
        return () => request.result;
      });
      return records.map(toPaper);
    },

    /** Enregistre une nouvelle fiche et son fichier, ensemble ou pas du tout.
     *  `file` peut manquer : c'est alors une note sans document. */
    async add(paper, file) {
      // Les conversions se font avant d'ouvrir la transaction : elle se
      // refermerait toute seule pendant qu'on attend.
      const record = Object.assign({}, paper, {
        thumbnail: paper.thumbnail ? await paper.thumbnail.arrayBuffer() : null,
      });
      // Une note sans document (`file` absent) n'a que sa fiche.
      const data = file ? await file.arrayBuffer() : null;
      await transaction([PAPERS, FILES], 'readwrite', (tx) => {
        tx.objectStore(PAPERS).add(record);
        if (data) tx.objectStore(FILES).add({ id: paper.id, type: file.type || paper.type || '', data });
      });
      return toPaper(record);
    },

    /** Modifie des champs d'une fiche. Renvoie la fiche à jour. */
    async update(id, changes) {
      const record = await transaction(PAPERS, 'readwrite', (tx) => {
        const store = tx.objectStore(PAPERS);
        const request = store.get(id);
        let updated = null;
        request.onsuccess = () => {
          if (!request.result) {
            tx.abort();
            return;
          }
          updated = Object.assign(request.result, changes, { id });
          store.put(updated);
        };
        return () => updated;
      });
      return toPaper(record);
    },

    /** Supprime une fiche, son fichier et ses pages supplémentaires. */
    async remove(id) {
      await transaction([PAPERS, FILES], 'readwrite', (tx) => {
        tx.objectStore(PAPERS).delete(id);
        tx.objectStore(FILES).delete(id);
        tx.objectStore(FILES).delete(pageRange(id));
      });
    },

    /*
     * Pages supplémentaires d'un papier (un courrier de plusieurs pages).
     * Chacune est rangée dans « files » sous la clé « <id du papier>#<page> » ;
     * la fiche garde leur ordre dans `extraPages` (liste de ces clés).
     */

    /** Ajoute une page à la fin. Renvoie la fiche à jour. */
    async addPage(id, blob) {
      const data = await blob.arrayBuffer();
      const key = id + '#' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const record = await transaction([PAPERS, FILES], 'readwrite', (tx) => {
        const papers = tx.objectStore(PAPERS);
        const request = papers.get(id);
        let updated = null;
        request.onsuccess = () => {
          if (!request.result) {
            tx.abort();
            return;
          }
          updated = request.result;
          updated.extraPages = (updated.extraPages || []).concat(key);
          papers.put(updated);
          tx.objectStore(FILES).add({ id: key, paperId: id, type: blob.type || '', data });
        };
        return () => updated;
      });
      return toPaper(record);
    },

    /** Retire une page supplémentaire. Renvoie la fiche à jour. */
    async removePage(id, key) {
      const record = await transaction([PAPERS, FILES], 'readwrite', (tx) => {
        const papers = tx.objectStore(PAPERS);
        const request = papers.get(id);
        let updated = null;
        request.onsuccess = () => {
          if (!request.result) {
            tx.abort();
            return;
          }
          updated = request.result;
          updated.extraPages = (updated.extraPages || []).filter((k) => k !== key);
          papers.put(updated);
          tx.objectStore(FILES).delete(key);
        };
        return () => updated;
      });
      return toPaper(record);
    },

    /** Les pages supplémentaires, dans l'ordre : [{ key, blob }]. */
    async getPages(paper) {
      const keys = paper.extraPages || [];
      if (keys.length === 0) return [];
      const records = await transaction(FILES, 'readonly', (tx) => {
        const store = tx.objectStore(FILES);
        const requests = keys.map((key) => store.get(key));
        return () => requests.map((request) => request.result);
      });
      return records
        .filter(Boolean)
        .map((record) => ({ key: record.id, blob: new Blob([record.data], { type: record.type }) }));
    },

    /** Le fichier d'un papier, ou null s'il est introuvable. */
    async getFile(id) {
      const record = await transaction(FILES, 'readonly', (tx) => {
        const request = tx.objectStore(FILES).get(id);
        return () => request.result;
      });
      return record ? new Blob([record.data], { type: record.type }) : null;
    },

    /*
     * Objets créés à la main : { id, name, kind, createdAt }. Un papier est
     * rattaché à un objet par son nom (champ `thing` de la fiche).
     */

    /** Tous les objets. */
    async listThings() {
      return transaction(THINGS, 'readonly', (tx) => {
        const request = tx.objectStore(THINGS).getAll();
        return () => request.result;
      });
    },

    /** Crée ou remplace un objet. */
    async putThing(thing) {
      await transaction(THINGS, 'readwrite', (tx) => {
        tx.objectStore(THINGS).put(Object.assign({}, thing));
      });
    },

    /** Supprime un objet (ses papiers ne sont pas touchés). */
    async removeThing(id) {
      await transaction(THINGS, 'readwrite', (tx) => {
        tx.objectStore(THINGS).delete(id);
      });
    },

    /**
     * Demande au navigateur de ne pas effacer les données de lui-même quand
     * la place vient à manquer. Sans effet si ce n'est pas pris en charge.
     */
    async requestPersistence() {
      try {
        if (!navigator.storage || !navigator.storage.persist) return false;
        if (await navigator.storage.persisted()) return true;
        return await navigator.storage.persist();
      } catch (error) {
        return false;
      }
    },
  };
})();
