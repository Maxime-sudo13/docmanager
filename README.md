# Mes papiers

Application web installable (PWA) pour ranger ses papiers administratifs et
être prévenu avant les échéances. Tout tourne dans le navigateur : aucun
serveur, aucun compte, les documents ne quittent jamais l'appareil.

Le cahier des charges, le plan et l'état d'avancement sont dans
[SPEC.md](SPEC.md).

## En ligne

Une fois GitHub Pages activé, l'application est à l'adresse
<https://maxime-sudo13.github.io/docmanager/>. C'est là qu'elle s'installe sur
un téléphone et que les notifications fonctionnent.

Seul le programme est en ligne. Les papiers restent sur l'appareil de chacun,
et une règle de sécurité inscrite dans la page interdit au navigateur de les
envoyer où que ce soit.

Pour activer GitHub Pages : dans le dépôt, « Settings », « Pages », choisir
« Deploy from a branch », la branche `main` et le dossier racine. Il n'y a
rien à construire : GitHub sert les fichiers tels quels.

## Essayer

Il n'y a rien à installer ni à compiler.

- **Le plus simple** : ouvrir `index.html` dans un navigateur. Tout fonctionne
  sauf les notifications.
- **Avec les notifications** : lancer `python3 -m http.server` dans ce
  dossier, puis ouvrir `http://localhost:8000` sur le même ordinateur.
- **Sur un téléphone, même réseau Wi-Fi** : avec la même commande, ouvrir
  `http://<adresse-de-l-ordinateur>:8000` sur le téléphone. Les notifications
  n'y fonctionneront pas : elles demandent une adresse en `https`, donc la mise
  en ligne.

## Tester les rappels

Un rappel est prévu 7 jours avant la date limite, puis la veille. Pour ne pas
attendre, ajouter `?date=AAAA-MM-JJ` à l'adresse : l'application fait alors
comme si nous étions ce jour-là, et l'indique par un bandeau.

1. Ouvrir `http://localhost:8000` et ajouter un papier dont la date limite
   tombe dans une vingtaine de jours. Exemple, un 11 novembre : date limite le
   1er décembre.
2. Toucher la cloche, puis « Activer les notifications » et accepter.
   « Envoyer une notification d'essai » doit en faire apparaître une.
3. La feuille « Rappels » liste les deux rappels prévus et leur date. Dans
   l'exemple : le 24 novembre et le 30 novembre.
4. Ouvrir l'application à la date du premier rappel :
   `http://localhost:8000/?date=2026-11-24`. La notification « Dans 7 jours »
   apparaît. Recharger la page ne la redonne pas.
5. Faire de même avec la veille, `http://localhost:8000/?date=2026-11-30` :
   la notification « Demain » apparaît.

## Tester les échéances qui reviennent

1. Ajouter un papier, toucher « + Montant ou abonnement », saisir un montant
   (« 13,49 ») et choisir « Chaque mois » avec une date limite.
2. Le total « Dépenses régulières » apparaît sous les trois cases ; le toucher
   ne montre que les échéances qui reviennent.
3. Toucher le rond « traité » : le papier reste à traiter, avec la date du
   mois suivant (« Annuler » la remet).
4. Cocher « Prélevé automatiquement » : le papier passe dans « Prélevés
   automatiquement », sans rappel. Avec `?date=AAAA-MM-JJ` après sa date, on
   le voit avancer seul.

## Tester les objets

1. Ajouter deux papiers avec « + Objet » → « Clio » (par exemple une facture
   de garage avec un montant et l'assurance).
2. Onglet « Objets » (en haut sur téléphone, à gauche sur ordinateur) : une
   carte « Clio » avec le nombre de papiers, le total et la prochaine
   échéance.
3. La toucher : la page de la Clio montre tous ses papiers. Le bouton Retour
   du téléphone ramène à la liste des objets. « Renommer » change le nom sur
   tous ses papiers ; « Ajouter un papier » lui rattache le nouveau.

## Tester les papiers à conserver

1. Ajouter un papier, choisir « À conserver » en haut de la fiche (une carte
   grise, avec l'objet « Clio »).
2. Il apparaît dans le groupe « À conserver », sans rond à cocher, et ne
   compte pas dans les trois cases. Sur la page de la Clio, il est en tête.
3. Un passeport « Valable jusqu'au » dans 5 jours affiche « Expire dans
   5 jours » et figure dans les rappels.

## Tester un objet créé à la main

1. Onglet « Objets », « Nouvel objet » : type Appareil, nom « iPhone ».
2. Sur sa page, « Ajouter un papier » (la facture, « À conserver ») : elle
   est rattachée d'office.
3. « Rattacher un papier existant » : choisir l'abonnement déjà enregistré.
4. « Modifier l'objet » : changer le nom ou le type, ou le supprimer (ses
   papiers restent).

## Tester la sauvegarde

1. Ajouter deux ou trois papiers, puis toucher « ⋮ » en haut à droite et
   « Exporter une sauvegarde ». Un fichier `mes-papiers-AAAA-MM-JJ.zip` est
   téléchargé.
2. Ouvrir ce fichier sur l'ordinateur : le dossier `papiers/` contient les
   documents, lisibles tels quels.
3. Ouvrir l'application dans une fenêtre de navigation privée (elle y est
   vide), toucher « ⋮ » puis « Restaurer une sauvegarde » et choisir le
   fichier : les papiers reviennent.

## Tester l'installation et le hors-ligne

À faire sur `http://localhost:8000`, dans Chrome ou Edge.

1. Toucher « ⋮ » puis « Installer l'application » : elle s'ouvre dans sa
   propre fenêtre, avec son icône. Si le bouton n'apparaît pas, le navigateur
   propose la même chose dans sa barre d'adresse ou son menu.
2. Arrêter le serveur (`Ctrl+C`), puis recharger : l'application s'ouvre quand
   même, avec ses papiers.
3. Relancer le serveur. Après une modification des fichiers, le message « Une
   nouvelle version est prête » propose de recharger.

Sur un téléphone, l'installation demande une adresse en `https` : elle se
testera après la mise en ligne.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page |
| `style.css` | Mise en forme |
| `app.js` | Interface : liste, ajout, consultation, rappels, sauvegarde |
| `store.js` | Accès aux données (IndexedDB) |
| `reminders.js` | Calcul des rappels |
| `backup.js` | Sauvegarde en un fichier `.zip` et restauration |
| `sw.js` | Service worker : notifications et fonctionnement hors ligne |
| `manifest.webmanifest` | Description de l'application pour l'installation |
| `icons/` | Icônes de l'application installée |
| `icon.svg` | Icône de l'onglet |
| `fonts/` | Polices Fraunces et Figtree (licence SIL OFL) |
