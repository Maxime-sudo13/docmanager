/*
 * Accès aux données de « Mes papiers ».
 *
 * Étape 1 : les papiers sont gardés en mémoire et disparaissent quand la page
 * est fermée ou rechargée. L'étape 2 remplacera l'intérieur de ce fichier par
 * IndexedDB. L'interface est déjà asynchrone pour que app.js n'ait pas à
 * changer à ce moment-là.
 */
const PaperStore = (function () {
  'use strict';

  const papers = [];

  return {
    /** Renvoie tous les papiers. */
    async list() {
      return papers.slice();
    },

    /** Enregistre un nouveau papier et le renvoie. */
    async add(paper) {
      papers.push(paper);
      return paper;
    },
  };
})();
