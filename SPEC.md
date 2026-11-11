# Mes papiers — cahier des charges

« Mes papiers » est une application web installable (PWA) pour ranger ses
papiers administratifs et être prévenu avant les échéances.

> À relire au début de chaque session de travail.

## Contraintes (non négociables)

- Zéro serveur, zéro API payante : tout tourne dans le navigateur.
- Les documents ne quittent jamais l'appareil.
- HTML, CSS et JavaScript simples, sans framework ni étape de build.
- Stockage local dans IndexedDB (photos comprises).
- Hébergeable gratuitement sur GitHub Pages.
- Pensée pour le téléphone d'abord, interface en français.

## Fonctionnalités du prototype (rien d'autre)

1. **Ajouter un papier** : photo ou fichier.
2. **Le qualifier à la main** : catégorie (impôts, santé, logement, banque,
   énergie, autre), organisme, date limite facultative.
3. **Retrouver** : liste triée par échéance la plus proche, filtre par
   catégorie, recherche par mot, bouton « traité ».
4. **Être prévenu** : rappel 7 jours avant et la veille.

## Hors périmètre

Pas de compte, pas de synchronisation, pas de partage, pas d'IA, pas d'envoi
de courrier.

## Choix par défaut

- Catégories fixes.
- Une seule date limite par papier.
- Rappels : notification locale, plus un bouton « Ajouter au calendrier »
  (fichier .ics) en repli, car les notifications PWA sont peu fiables sur
  iPhone.
- Export de sauvegarde en un fichier.

## Plan

Une étape à la fois. On s'arrête après chacune pour tester avant de passer à
la suivante.

1. Squelette, liste vide, ajout d'un papier avec photo
2. Les trois champs et le stockage local
3. Liste triée, filtre, recherche
4. Rappels
5. Export de sauvegarde, installation sur l'écran d'accueil
6. Mise en ligne sur GitHub Pages

## Suivi

| Étape | État |
| --- | --- |
| 1. Squelette, liste vide, ajout avec photo | Livrée, en attente de test |
| 2. Trois champs et stockage local | À faire |
| 3. Liste triée, filtre, recherche | À faire |
| 4. Rappels | À faire |
| 5. Export de sauvegarde, installation | À faire |
| 6. Mise en ligne sur GitHub Pages | À faire |

## Notes techniques

Décisions prises en cours de route, à respecter dans les étapes suivantes.

- **Fichiers à la racine** : `index.html`, `style.css`, `store.js`, `app.js`.
  Pas de sous-dossiers tant que ce n'est pas nécessaire.
- **Scripts classiques, pas de modules ES** : l'application doit s'ouvrir par
  un simple double-clic sur `index.html` (`file://`), où les modules sont
  bloqués.
- **Aucune ressource externe** : ni police, ni CDN, ni mesure d'audience.
  Police système uniquement.
- **`store.js` est la seule porte d'accès aux données.** Son interface est
  asynchrone (`PaperStore.list()`, `PaperStore.add()`). À l'étape 1 il garde
  les papiers en mémoire ; l'étape 2 remplace l'intérieur par IndexedDB sans
  toucher à `app.js`.
- **Un papier** = `{ id, source, fileName, type, size, file, thumbnail,
  createdAt }`. `file` est le fichier d'origine, non modifié ; `thumbnail` est
  une vignette JPEG (320 px maxi) fabriquée à l'ajout pour que la liste reste
  légère sur téléphone. L'étape 2 ajoute `category`, `organisation`, `dueDate`
  et `done`.
- **Formats acceptés** : images et PDF.
