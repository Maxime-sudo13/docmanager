# Mes papiers

Application web installable (PWA) pour ranger ses papiers administratifs et
être prévenu avant les échéances. Tout tourne dans le navigateur : aucun
serveur, aucun compte, les documents ne quittent jamais l'appareil.

Le cahier des charges, le plan et l'état d'avancement sont dans
[SPEC.md](SPEC.md).

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
6. Dans la fiche du papier, « Ajouter au calendrier » télécharge un fichier
   `.ics`. L'ouvrir propose un évènement avec deux alertes.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page |
| `style.css` | Mise en forme |
| `app.js` | Interface : liste, ajout, consultation, rappels |
| `store.js` | Accès aux données (IndexedDB) |
| `reminders.js` | Calcul des rappels et fichier de calendrier |
| `sw.js` | Service worker : affiche les notifications |
| `icon.svg` | Icône |
