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
| 2. Trois champs et stockage local | Livrée |
| 3. Liste triée, filtre, recherche | Livrée |
| 4. Rappels | Livrée |
| 5. Export de sauvegarde, installation | Livrée, en attente de test |
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

Étape 3 :

- **Deux groupes : « À traiter », puis « Traités ».** Un papier traité quitte la
  liste de ce qu'il reste à faire mais reste consultable et retrouvable.
- **Tri des papiers à traiter** : échéance la plus proche d'abord, donc les
  retards en tête ; viennent ensuite les papiers sans date, du plus récent au
  plus ancien. Les traités sont rangés du dernier traité au plus ancien.
- **Les échéances proches sont dites en clair** : « En retard », « Aujourd'hui »,
  « Demain », « Dans 5 jours » (jusqu'à 7 jours, comme le premier rappel de
  l'étape 4), en rouge ou en orange. Au-delà, la date seule.
- **Le bouton « traité » est un rond à cocher** au bout de chaque ligne, et un
  bouton en toutes lettres dans la feuille du papier. Un message propose
  « Annuler » pendant quelques secondes, au cas où le doigt aurait glissé.
- **Le filtre ne montre que les catégories utilisées**, une seule à la fois, et
  n'apparaît qu'à partir de deux catégories.
- **La recherche fouille** l'organisme, la catégorie, le nom du fichier et la
  date limite en toutes lettres (« décembre »), sans tenir compte des accents ni
  des majuscules. Avec plusieurs mots, tous doivent être présents. Elle porte
  aussi sur les papiers traités.
- **L'en-tête compte ce qu'il reste à traiter**, plutôt que le total.
- **Après un ajout ou une modification, le papier est amené à l'écran** et
  signalé un instant ; si la recherche ou le filtre le cachaient, ils sont levés.

Étape 4 :

- **Ce que peut une notification sans serveur.** Rien ne peut réveiller
  l'application à heure fixe : elle donne donc ses rappels quand elle tourne,
  c'est-à-dire à l'ouverture, au retour au premier plan, puis toutes les heures
  tant qu'elle reste ouverte. Un rappel manqué est rattrapé à l'ouverture
  suivante, tant que la date limite n'est pas dépassée. Sur Android, une fois
  l'application installée, le navigateur peut en plus la réveiller de temps en
  temps en arrière-plan ; c'est demandé, sans garantie.
- **Le calendrier est le rappel sûr.** « Ajouter au calendrier » crée un
  évènement sur la journée de la date limite, avec deux alertes à 9 h : 7 jours
  avant et la veille. C'est l'agenda du téléphone qui prévient, application
  fermée ou non. Rajouter le même papier après un changement de date met à jour
  l'évènement au lieu d'en créer un second.
- **Un rappel n'est donné qu'une fois**, jamais pour un papier traité, jamais
  pour une échéance dépassée (la liste l'affiche déjà en rouge). Changer la
  date limite relance les deux rappels.
- **Pas de rappel pour une échéance qu'on vient de saisir** : un papier ajouté
  à trois jours de sa date limite ne déclenche pas « dans 3 jours » dans la
  seconde ; il sera rappelé la veille.
- **Au-delà de trois rappels dus en même temps, un seul message les regroupe**
  (retour de vacances, première activation).
- **L'autorisation n'est jamais demandée d'office.** Après l'enregistrement
  d'une date limite, un message propose « Activer » ; un point sur la cloche de
  l'en-tête rappelle que ce n'est pas fait. Si la demande est écartée sans
  réponse, l'application n'insiste pas.
- **La cloche ouvre la feuille « Rappels »** : état des notifications,
  notification d'essai, liste des prochains rappels, et le rappel honnête de la
  limite ci-dessus.
- **Toucher une notification ouvre la fiche du papier.**
- **Outil d'essai** : ajouter `?date=AAAA-MM-JJ` à l'adresse fait croire à
  l'application que nous sommes ce jour-là, avec un bandeau bien visible. Sans
  cela, on ne peut vérifier un rappel qu'en attendant plusieurs jours. Ce n'est
  pas une fonctionnalité : à retirer si elle gêne.

Étape 5 :

- **La sauvegarde est une archive `.zip` ordinaire.** Les papiers y sont rangés
  tels quels dans `papiers/`, avec des noms lisibles
  (`edf_2026-11-30_1a2b3c4d.jpg`) ; `mes-papiers.json` décrit chacun. On peut
  donc l'ouvrir sur n'importe quel ordinateur et retrouver ses documents sans
  l'application. Pas de compression : photos et PDF le sont déjà.
- **Une sauvegarde se restaure**, sans quoi ce n'en serait pas une. Restaurer
  ajoute les papiers manquants et ne touche jamais à ceux qui sont déjà là :
  ni fusion, ni écrasement, ni doublon si on restaure deux fois.
- **Une sauvegarde abîmée rend ce qu'elle peut.** Chaque fichier est vérifié
  par sa somme de contrôle ; les papiers sains reviennent, les autres sont
  comptés et signalés. Une archive recompressée par un autre outil est
  acceptée.
- **Une sauvegarde vient de l'extérieur, on s'en méfie.** Chaque champ est
  revérifié à la restauration et seuls les champs connus sont repris. Plus
  largement, seul un PDF s'ouvre dans le navigateur : tout autre fichier qui
  n'est pas une image est téléchargé, jamais exécuté dans l'application.
- **Un point sur le bouton « ⋮ » conseille une sauvegarde** quand il y a au
  moins trois papiers, du nouveau depuis la dernière, et qu'elle date de plus
  de trente jours (ou n'a jamais été faite). Rien de plus insistant.
- **Hors ligne : la copie d'abord, le réseau ensuite.** L'application s'ouvre
  aussitôt depuis sa copie, même sans connexion. En parallèle elle redemande
  ses fichiers au serveur ; s'ils ont changé, un message « Une nouvelle version
  est prête » propose de recharger. On n'est donc jamais bloqué par le réseau,
  et jamais longtemps en retard d'une version.
- **Installation** : un bouton quand le navigateur sait le proposer (Chrome,
  Edge, Android) ; sur iPhone, où ce n'est pas possible, la marche à suivre
  dans Safari. Le bouton « ⋮ » de l'en-tête ouvre « Sauvegarde et
  installation ».
- **Dans l'application installée sur iPhone, les fichiers sont remis par la
  feuille de partage** (« Enregistrer dans Fichiers »), le téléchargement n'y
  existant pas. Cela vaut pour la sauvegarde et pour le fichier de calendrier.
- **L'en-tête** : avec deux boutons, le compteur se réduit à « Tout traité »
  et s'efface sur les écrans de moins de 340 px.

## Notes techniques

À respecter dans les étapes suivantes.

- **Fichiers à la racine** : `index.html`, `style.css`, `store.js`,
  `reminders.js`, `backup.js`, `app.js`, `sw.js`, `manifest.webmanifest`,
  `icon.svg`. Un seul sous-dossier, `icons/`, pour les icônes PNG de
  l'installation ; elles reprennent le dessin de `icon.svg` et sont à refaire
  s'il change.
- **Tout fichier ajouté à l'application doit l'être aussi à la liste `FILES`
  de `sw.js`**, sinon il manquera hors ligne.
- **Scripts classiques, pas de modules ES** : l'application doit s'ouvrir par
  un simple double-clic sur `index.html` (`file://`), où les modules sont
  bloqués.
- **Aucune ressource externe** : ni police, ni CDN, ni mesure d'audience.
  Police système uniquement.
- **`store.js` est la seule porte d'accès aux données.** Interface asynchrone :
  `PaperStore.list()`, `add(paper, file)`, `update(id, changes)`, `remove(id)`,
  `getFile(id)`, `requestPersistence()`. `app.js` ne touche jamais à IndexedDB.
- **Base IndexedDB `mes-papiers`, version 1, deux tables** indexées par `id` :
  - `papers` : la fiche `{ id, category, organisation, dueDate, done, doneAt,
    reminded, fileName, type, size, createdAt, updatedAt, thumbnail }` ;
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
  `done` dit si le papier est traité ; `doneAt` est alors l'instant où il l'a
  été (`null` sinon, et absent des fiches créées à l'étape 2).
  `thumbnail` est une vignette JPEG de 320 px au plus, ou `null`.
  `reminded` retient les rappels déjà donnés : `{ week, eve }`, où chaque
  valeur est la date limite pour laquelle le rappel a été donné (une autre
  date limite, ou rien, veut dire « pas encore donné »).
- **Formats acceptés** : images et PDF. Un PDF n'a pas de vignette et s'ouvre
  dans un nouvel onglet du navigateur.
- **Tri, filtre et recherche se font en mémoire**, dans `app.js`, à chaque
  affichage : pas d'index dans la base.
- **`reminders.js` est chargé par la page et par le service worker.** Il ne
  touche donc jamais à l'affichage. C'est la seule définition de
  « aujourd'hui » (`Reminders.today()`), du nombre de jours restants
  (`daysUntil()`) et du seuil de 7 jours (`WEEK_DAYS`) : la liste et les
  rappels s'appuient dessus. Il décide des rappels dus (`pending()`), les
  donne (`check(notify)`) et fabrique le fichier `.ics` (`toICS()`).
- **`sw.js`, le service worker, fait deux choses.** Les rappels : il affiche
  les notifications (sur Android, une page n'a pas le droit de le faire
  elle-même), ouvre la fiche quand on en touche une, et répond à la
  vérification en arrière-plan (`periodicsync`, étiquette `rappels`). Le hors
  ligne : il garde une copie des fichiers de l'application (cache
  `mes-papiers`), la sert aussitôt, puis redemande chaque fichier au serveur
  et prévient la page (`update-available`) si l'un a changé. Il ne garde
  jamais les papiers, qui sont dans IndexedDB. Il ne s'installe que sur une
  adresse en `https` ou sur `localhost`, pas en `file://`.
- **`backup.js`** écrit et relit l'archive `.zip` lui-même (une centaine de
  lignes, pas de bibliothèque) : `Backup.exportAll()` et
  `Backup.restore(file, categories)`. Format de sauvegarde : version 1. Le
  faire évoluer demande de monter `VERSION` et de continuer à lire l'ancien.
- **La date de la dernière sauvegarde** est gardée dans `localStorage`
  (`mes-papiers.derniere-sauvegarde`), pas dans la base : c'est un réglage de
  l'appareil, qui ne doit pas voyager avec une restauration.
- **Validation maison** (`novalidate` + messages en français sous les champs),
  plutôt que les bulles du navigateur, qui s'affichent mal sur des cases
  masquées et suivent la langue du téléphone.

## Points à surveiller

- **iPhone, application non installée** : Safari peut effacer les données d'un
  site resté une semaine sans visite. L'installation sur l'écran d'accueil et
  l'export de sauvegarde (étape 5) sont la vraie protection.
- **Ouverture d'un PDF une fois l'application installée sur iPhone** : le lien
  vers un nouvel onglet reste à vérifier sur un vrai appareil, ce qui ne sera
  possible qu'après la mise en ligne.
- **Rien n'a encore été essayé sur un vrai téléphone** : appareil photo,
  sélecteur de date et clavier sont à valider par l'utilisateur.
- **Notifications sur téléphone** : elles demandent une adresse en `https`,
  donc la mise en ligne (étape 6) ; sur iPhone il faut en plus que
  l'application soit installée sur l'écran d'accueil (étape 5). D'ici là, elles
  ne se vérifient que sur ordinateur, en `localhost`.
- **Fichier `.ics`** : l'ouverture sur iPhone (Safari, puis application
  installée) et sur Android reste à vérifier. Google Agenda est connu pour
  ignorer les alertes d'un fichier importé et appliquer les siennes.
- **Installation sur téléphone** : elle demande une adresse en `https`, donc
  la mise en ligne (étape 6). Vérifiée ici sur ordinateur seulement.
- **Feuille de partage sur iPhone** (sauvegarde, calendrier) : écrite d'après
  la documentation et vérifiée en simulation, jamais sur un vrai iPhone.
- **Taille de la sauvegarde** : l'archive est assemblée par le navigateur
  avant d'être remise. Sans souci pour quelques centaines de papiers ; à
  surveiller au-delà de quelques centaines de Mo sur un téléphone. Limite du
  format : 4 Go.
- **À décider à l'étape 6** : une politique de sécurité de contenu (CSP) dans
  `index.html`, qui interdirait techniquement toute requête vers l'extérieur.
  Elle ferait de « les documents ne quittent jamais l'appareil » une garantie
  du navigateur, mais doit être essayée avec l'ouverture en `file://`.
