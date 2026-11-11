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
| 1. Squelette, liste vide, ajout avec photo | Livrée |
| 2. Trois champs et stockage local | Livrée, en attente de test |
| 3. Liste triée, filtre, recherche | À faire |
| 4. Rappels | À faire |
| 5. Export de sauvegarde, installation | À faire |
| 6. Mise en ligne sur GitHub Pages | À faire |

## Décisions prises en cours de route

Le 11 novembre 2026, l'utilisateur a demandé de trancher soi-même tout ce qui
sert une bonne utilisation, sans lui poser la question. Chaque choix est noté
ici pour qu'il puisse le relire et le contester.

- **Un papier se modifie après coup.** Toucher un papier dans la liste ouvre sa
  feuille : aperçu du fichier, et les trois champs, modifiables. Sans cela, une
  faute de frappe ou une date oubliée seraient définitives.
- **Un papier se supprime**, depuis sa feuille, après confirmation. La
  suppression efface la fiche et le fichier.
- **Catégorie et organisme sont obligatoires**, la date limite est facultative.
  Aucune catégorie n'est cochée d'avance, pour éviter que tout finisse dans
  « Autre » par défaut.
- **Les organismes déjà saisis sont proposés pendant la frappe**, pour ne pas
  retaper « Direction générale des Finances publiques » et pour que la recherche
  retrouve toujours la même orthographe.
- **Les grandes photos sont ramenées à 2400 px** sur leur plus grand côté (JPEG,
  qualité 85 %), soit environ 200 points par pouce pour une page A4 : le texte
  reste bien lisible, et le fichier pèse plusieurs fois moins lourd. Moins de
  risque de saturer le téléphone, et une sauvegarde (étape 5) qui reste
  maniable. Les PDF et les images déjà petites sont gardés à l'octet près.
  À revoir si des petits caractères s'avèrent illisibles à l'usage.
- **Toucher le fond assombri ne ferme pas la feuille pendant la saisie**, pour
  qu'un geste maladroit ne fasse pas perdre ce qui vient d'être tapé. La croix
  et la touche Échap ferment.
- **L'application demande au navigateur de conserver ses données**
  (`navigator.storage.persist()`), après le premier ajout. Sans effet là où ce
  n'est pas pris en charge.

## Notes techniques

À respecter dans les étapes suivantes.

- **Fichiers à la racine** : `index.html`, `style.css`, `store.js`, `app.js`.
  Pas de sous-dossiers tant que ce n'est pas nécessaire.
- **Scripts classiques, pas de modules ES** : l'application doit s'ouvrir par
  un simple double-clic sur `index.html` (`file://`), où les modules sont
  bloqués.
- **Aucune ressource externe** : ni police, ni CDN, ni mesure d'audience.
  Police système uniquement.
- **`store.js` est la seule porte d'accès aux données.** Interface asynchrone :
  `PaperStore.list()`, `add(paper, file)`, `update(id, changes)`, `remove(id)`,
  `getFile(id)`, `requestPersistence()`. `app.js` ne touche jamais à IndexedDB.
- **Base IndexedDB `mes-papiers`, version 1, deux tables** indexées par `id` :
  - `papers` : la fiche `{ id, category, organisation, dueDate, done,
    fileName, type, size, createdAt, updatedAt, thumbnail }` ;
  - `files` : `{ id, type, data }`, le fichier lui-même, rangé à part pour que
    l'affichage de la liste ne charge pas toutes les photos en mémoire.

  Fiche et fichier sont écrits et supprimés dans une même transaction. Tout
  changement de structure passe par une montée de version de la base.
- **Les fichiers sont stockés en `ArrayBuffer`**, pas en `Blob` : c'est la forme
  la mieux prise en charge d'un navigateur à l'autre. `store.js` reconvertit en
  `Blob` à la lecture.
- **Champs** : `category` est l'un de `impots`, `sante`, `logement`, `banque`,
  `energie`, `autre` (la liste et les libellés sont dans `app.js`). `dueDate`
  est `null` ou un jour au format `AAAA-MM-JJ`, sans heure ni fuseau.
  `done` vaut `false` pour l'instant : il servira au bouton « traité » de
  l'étape 3. `thumbnail` est une vignette JPEG de 320 px au plus, ou `null`.
- **Formats acceptés** : images et PDF. Un PDF n'a pas de vignette et s'ouvre
  dans un nouvel onglet du navigateur.
- **Validation maison** (`novalidate` + messages en français sous les champs),
  plutôt que les bulles du navigateur, qui s'affichent mal sur des cases
  masquées et suivent la langue du téléphone.

## Points à surveiller

- **iPhone, application non installée** : Safari peut effacer les données d'un
  site resté une semaine sans visite. L'installation sur l'écran d'accueil et
  l'export de sauvegarde (étape 5) sont la vraie protection.
- **Ouverture d'un PDF une fois l'application installée sur iPhone** : le lien
  vers un nouvel onglet est à vérifier à l'étape 5.
- **Rien n'a encore été essayé sur un vrai téléphone** : appareil photo,
  sélecteur de date et clavier sont à valider par l'utilisateur.
