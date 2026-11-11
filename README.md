# Mes papiers

Application web installable (PWA) pour ranger ses papiers administratifs et
être prévenu avant les échéances. Tout tourne dans le navigateur : aucun
serveur, aucun compte, les documents ne quittent jamais l'appareil.

Le cahier des charges, le plan et l'état d'avancement sont dans
[SPEC.md](SPEC.md).

## Essayer

Il n'y a rien à installer ni à compiler.

- **Sur un ordinateur** : ouvrir `index.html` dans un navigateur.
- **Sur un téléphone, même réseau Wi-Fi** : lancer `python3 -m http.server`
  dans ce dossier, puis ouvrir `http://<adresse-de-l-ordinateur>:8000` sur le
  téléphone.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page |
| `style.css` | Mise en forme |
| `app.js` | Interface : liste, ajout, consultation |
| `store.js` | Accès aux données |
| `icon.svg` | Icône |
