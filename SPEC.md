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

## Évolution validée le 13 novembre 2026

Après une réflexion sur un « assistant du quotidien » en plusieurs modules
(abonnements, budget, véhicule, maison…), l'utilisateur a validé la
direction proposée : ne pas empiler des modules, mais élargir le cœur
existant. La plupart de ces besoins sont des **échéances** (une date, un
montant, un document). Ajouts admis dans le périmètre, dans cet ordre :

1. **Échéances qui reviennent et montants** (étape 11) : abonnements,
   assurance, contrôle technique, entretien, avec un total par mois.
2. **Les objets** (étape 12, plus tard) : rattacher des papiers à une voiture,
   un logement, un appareil, pour en avoir l'historique.
3. **Repérer seul les dates dans une note** (étape 10, plus tard), sans IA.

Les contraintes ne changent pas. Restent hors périmètre : courses, liste de
souhaits, budget complet, connexion bancaire, IA.

## Hors périmètre

Pas de compte, pas de synchronisation, pas de partage, pas d'IA, pas d'envoi
de courrier.

## Choix par défaut

- Catégories : six de base, plus celles que l'utilisateur ajoute avec la
  couleur de son choix (depuis le 14 novembre 2026, à sa demande).
- Une seule date limite par papier.
- Rappels : notification locale. Le bouton « Ajouter au calendrier » (fichier
  .ics) prévu en repli a été retiré le 13 novembre 2026 à la demande de
  l'utilisateur : il ne fonctionnait pas dans l'application installée sur
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
7. Retravail du design (ajouté par l'utilisateur le 11 novembre 2026)

## Suivi

| Étape | État |
| --- | --- |
| 1. Squelette, liste vide, ajout avec photo | Livrée |
| 2. Trois champs et stockage local | Livrée |
| 3. Liste triée, filtre, recherche | Livrée |
| 4. Rappels | Livrée |
| 5. Export de sauvegarde, installation | Livrée |
| 6. Mise en ligne sur GitHub Pages | Livrée : https://maxime-sudo13.github.io/docmanager/ |
| 7. Retravail du design | Livrée |
| 8. Plusieurs pages, apparence, rappel de sauvegarde | Livrée |
| 9. Notes : écrire ou dicter, avec ou sans document | Livrée, en attente de test |
| 10. Repérer seul dates et actions dans une note | À faire, plus tard (idée 3 de l'analyse du 13 novembre) |
| 11. Échéances qui reviennent et montants | Livrée, en attente de test |
| 12. Objets (voiture, logement, appareils) | Livrée (page à part depuis la PR #14) |
| 13. Papiers à conserver | Livrée, en attente de test |
| 13 bis. Créer un objet sans papier, rattacher des papiers existants | Livrée (PR #15) |
| 13 ter. Catégories personnelles, objet choisi dans une liste, papiers à conserver sans date | Livrée (PR #16) |
| 13 quater. Groupes repliables, objets rangés par type | Livrée, en attente de test |
| 14. Nouvelle structure : « À faire », « Classeur », « Objets » | Proposée, à valider |

## Retours de l'utilisateur

- **11 novembre 2026, après l'étape 5** : l'application est jugée intuitive,
  facile et utile. Le design peut être nettement mieux : il sera retravaillé
  après la mise en ligne, avec l'objectif de la rendre « très jolie ».
  Commencer par montrer deux ou trois maquettes de l'écran principal et le
  laisser choisir, avant de toucher au code. Les contraintes restent : pas de
  framework, aucune ressource externe (une police de caractères doit être
  embarquée dans le dépôt), téléphone d'abord.

- **12 novembre 2026, étape 7** : sur trois maquettes (A « Papeterie »,
  B « Net et lumineux », C « Doux et coloré »), l'utilisateur choisit A, avec
  le résumé du haut en trois cases séparées comme sur C.

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
- **Le calendrier (fichier .ics) a été retiré** le 13 novembre 2026 : voir
  « Points à surveiller ».
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
  existant pas. Cela vaut pour la sauvegarde.
- **L'en-tête** : avec deux boutons, le compteur se réduit à « Tout traité »
  et s'efface sur les écrans de moins de 340 px.

Étape 6 :

- **Publication « depuis une branche », sans rien construire.** GitHub Pages
  sert les fichiers du dépôt tels quels : ni étape de build, ni automatisation
  à entretenir. Un fichier vide `.nojekyll` lui dit de ne rien transformer.
  L'adresse sera `https://maxime-sudo13.github.io/docmanager/`.
- **Une règle de sécurité stricte dans `index.html`** (demandée par
  l'utilisateur). Le navigateur refuse à la page toute requête vers un autre
  site, toute requête d'envoi, tout script ou style écrit dans la page, et
  `eval`. « Les documents ne quittent jamais l'appareil » devient une garantie
  du navigateur et plus seulement une promesse du code.
- **Le dépôt devient public** (accord de l'utilisateur) : c'est la condition
  de l'hébergement gratuit. Son adresse e-mail personnelle, présente dans le
  premier commit, doit être retirée de l'historique avant.

Étape 7 (design « Papeterie ») :

- **Deux polices embarquées**, Fraunces (titres) et Figtree (texte), sous
  licence SIL OFL, dans `fonts/`. Environ 100 Ko en tout, gardées hors ligne.
- **Couleurs** : papier crème et encre bleu nuit ; chaque catégorie a sa
  couleur. Six teintes bien séparées, à la demande de l'utilisateur (12 novembre
  2026) : impôts bleu, santé vert, logement orange, banque framboise,
  énergie jaune (texte foncé sur sa bande), autre gris.
  **Toujours en clair** : le thème sombre automatique a été retiré
  le 12 novembre 2026, l'utilisateur (iPhone en mode sombre) voulant le
  rendu crème qu'il avait choisi. Le remettre en option si demandé.
- **Chaque papier est une fiche** avec une tranche de couleur sur le bord
  (sa catégorie) et un petit calendrier : le mois en haut, le jour en grand,
  l'année si ce n'est pas celle en cours, en rouge si l'échéance est passée.
  Sans date limite : « Sans date » dans la bande de couleur, et l'icône de la
  catégorie à la place du jour.
  La vignette de la photo n'est plus dans la liste : elle reste en tête de la
  fiche du papier. La date sans urgence n'est plus répétée en toutes lettres.
- **Résumé en trois cases** sous le titre : en retard, cette semaine (7
  jours), à traiter. Les trois cases gardent toujours leurs couleurs, même à
  0 (demande de l'utilisateur). Il remplace le
  compteur de l'en-tête. La date du jour s'affiche sous le titre.
- **Ordinateur (à partir de 1000 px de large) : trois volets.** À gauche, les
  catégories avec leur nombre de papiers, « Ajouter un papier », « Rappels »
  et « Sauvegarde ». Au milieu, la liste. À droite, la fiche du papier choisi,
  qui ne masque plus la liste ; Échap la ferme. Entre 640 et 1000 px, la mise
  en page du téléphone, centrée. Le résumé s'affiche même sans papier, sinon
  la page vide ressemblait trop à l'ancienne version (retour de
  l'utilisateur, 12 novembre 2026).

Étape 8 (13 novembre 2026, demandée par l'utilisateur ; les échéances qui
reviennent sont remises à plus tard) :

- **Plusieurs pages par papier.** « Ajouter une page » sous l'aperçu, à
  l'ajout comme dans la fiche ; chaque page se voit et se retire. Rien n'est
  écrit avant « Ajouter » ou « Enregistrer ». Les photos sont réduites comme la
  première page. La liste affiche « 3 pages ».
- **Apparence : Clair ou Sombre**, dans « ⋮ ». Clair par défaut, quel que soit
  le réglage du téléphone ; le choix est gardé par l'appareil.
- **Rappel de sauvegarde visible** : un encadré en haut de la liste quand une
  sauvegarde est conseillée (mêmes règles que le point sur « ⋮ »).
  « Sauvegarder » ouvre la feuille et lance l'export ; « Plus tard » le masque
  7 jours.
- **Plan de commercialisation** : rédigé à part, dans un document Claude Docs
  (pas dans ce dépôt public).

Étape 9 (13 novembre 2026) : première marche de l'idée « transformer une
conversation en choses à faire », réduite à ce qui tient sans IA ni serveur.

- **« Écrire ou dicter une note »**, troisième choix de « Ajouter un papier » :
  un papier sans document, dont la note est obligatoire. On dicte avec le
  micro du clavier du téléphone (l'application n'enregistre rien elle-même).
  Catégorie, organisme et date limite comme pour un papier, donc les mêmes
  rappels.
- **Tous les papiers ont un champ « Note »** facultatif, replié derrière
  « + Note » (« + Ajouter une note » jusqu'à l'étape 11) quand il y a un document (sinon « Ajouter » ne
  tient plus dans l'écran d'un téléphone), déplié s'il est déjà rempli.
- La première ligne de la note s'affiche dans la liste ; la recherche fouille
  la note.
- **Plus tard (étape 10)** : repérer seul, sur le téléphone, les dates et les
  verbes d'action dans la note pour préremplir la date limite.

Étape 11 (13 novembre 2026, « fais au mieux ») : échéances qui reviennent et
montants.

- **Deux champs facultatifs, « Montant » et « Revient »** (non, chaque mois,
  tous les 3 mois, chaque année, tous les 2 ans), côte à côte et repliés
  derrière « + Montant ou abonnement ». « + Note » est sur la même ligne,
  juste au-dessus du bouton : sans cela « Ajouter » sortait de l'écran d'un
  téléphone (vérifié à 390 × 844). Une note ajoutée à un papier avec document
  s'ouvre donc en bas de la fiche.
- **Une échéance qui revient demande une date** : c'est la prochaine.
- **Traiter une échéance qui revient la repousse** à la suivante au lieu de la
  ranger dans « Traités » : une seule fiche par abonnement, toujours à jour.
  Le message dit la nouvelle date et propose « Annuler ». La fiche garde la
  liste des échéances traitées (24 au plus) : « Déjà traitée 3 fois, la
  dernière le… ». Le bouton de la fiche dit « Traité · prochaine le 25 déc. ».
- **Le jour d'origine est gardé** : une échéance du 31 passe au 28 février,
  puis revient au 31 mars.
- **« Prélevé automatiquement »** (case proposée dès qu'une échéance
  revient) : rien à faire, donc ni rappel, ni rond « traité », ni place dans
  les trois cases ; la date passe seule à l'échéance suivante une fois
  dépassée. Ces papiers ont leur propre groupe, « Prélevés automatiquement »,
  entre « À traiter » et « Traités ». Dans la fiche, le bouton devient
  « Arrêter : ne revient plus » (le papier rejoint les traités).
- **Total sous les trois cases** : « Dépenses régulières · 1 263,99 € par
  mois », chaque montant ramené au mois (une assurance à 600 € par an compte
  pour 50 €). Toucher ce total ne montre que les échéances qui reviennent ;
  le toucher à nouveau montre tout. Les montants des papiers qui ne reviennent
  pas s'affichent dans la liste mais ne comptent pas dans ce total.
- **Montant saisi librement** : « 45,90 », « 45.9 » ou « 1 200 € » sont
  compris ; sinon un message demande des chiffres. La recherche trouve un
  papier par son montant (« 600 ») ou par « chaque mois ».

Étape 12 (13 novembre 2026, « continue, on testera tout après ») : les
objets.

- **Un objet est un nom libre** (« Clio », « Appartement », « Lave-linge »)
  porté par le papier, dans un champ « Objet concerné » replié derrière
  « + Objet », sur la ligne de « + Note » et « + Montant ou abonnement ».
  Les noms déjà saisis sont proposés pendant la frappe. Pas de liste d'objets
  à gérer à part, pas de type d'objet : c'est le plus simple à saisir, et ça
  suffit pour regrouper.
- **« clio » et « Clio » sont le même objet** (majuscules, accents et espaces
  ignorés). Il s'affiche sous l'orthographe la plus fréquente, à égalité sous
  la première saisie.
- **Une page à part pour les objets** (retour de l'utilisateur, 13 novembre
  2026 : la première version, avec des pastilles d'objets sous les
  catégories, « n'était pas fluide »). Sur téléphone, deux onglets en haut :
  « Papiers » et « Objets ». La page « Objets » montre une carte par objet
  (nom, nombre de papiers, montants en tout, prochaine échéance) ; toucher une
  carte ouvre la page de l'objet, avec un en-tête (« ‹ Tous les objets »,
  nom, chiffres, « Renommer ») et tous ses papiers, rangés comme sur la page
  des papiers. Le résumé, la recherche et les catégories ne s'affichent que
  sur la page des papiers. Sur ordinateur, pas d'onglets : « Objets » et la
  liste des objets sont dans la barre latérale.
- **La page est dans l'adresse** (`#objets`, `#objet=clio`) : le bouton
  Retour du téléphone ramène à la page précédente.
- **Montants d'un objet** : chaque papier compte une fois ; une échéance qui
  revient compte autant de fois qu'elle a été traitée, plus l'échéance en
  cours.
- **« Renommer »** change tous ses papiers (deux objets renommés pareil se
  rejoignent). **« Ajouter un papier »** depuis la page d'un objet lui
  rattache le nouveau papier.
- Sur la page des papiers, l'objet s'affiche avec une étiquette ; la
  recherche trouve un papier par son objet.
- Vider le champ retire le papier de l'objet ; un objet sans papier disparaît
  (retour à la page « Objets »).

Étape 13 (14 novembre 2026, demandée par l'utilisateur : « une section
papiers à conserver pour chaque objet ») :

- **Un papier est « À traiter » ou « À conserver »**, au choix en haut de la
  fiche (deux boutons côte à côte, « À traiter » par défaut). À conserver :
  carte grise, contrat, garantie, diplôme… Rien à faire, donc pas de rond
  « traité », pas de place dans les trois cases du résumé, pas de « Revient ».
- **(Remplacé à l'étape 13 ter : plus de date.)** Sa date devenait « Valable jusqu'au », facultative : un passeport, une
  garantie. Elle garde les rappels 7 jours avant et la veille, et la liste dit
  « Expire dans 5 jours » ou « Expiré ».
- **Un groupe « À conserver »** dans la liste, rangé par organisme comme un
  classeur. Sur la page d'un objet, il passe **en tête** (la carte grise avant
  les factures) ; la carte de l'objet dit « 1 à conserver ».
- **« Ne plus conserver (archiver) »** dans la fiche le range dans les
  traités ; « Annuler » le remet.
- **« + Page » passe à côté de la légende de l'aperçu** (« Image · 366 Ko »),
  en plus petit, et la rangée des pages n'apparaît que s'il y en a : c'est la
  place qu'il fallait pour le choix « À traiter / À conserver » sans que
  « Ajouter » sorte de l'écran du téléphone.
- Les papiers déjà enregistrés restent « À traiter ».

Étape 13 bis (14 novembre 2026, demandée par l'utilisateur : « ajouter un
objet comme j'ai acheté un nouveau téléphone, je veux mettre la facture dans
cet objet-là, plus mon abonnement ou mon assurance ») :

- **« Nouvel objet »** en tête de la page « Objets » : un type (Véhicule,
  Logement, Appareil, Autre ; Appareil par défaut) et un nom. L'objet existe
  aussitôt, sans papier, et sa page s'ouvre : « Aucun papier pour
  l'instant… ». Le type donne le dessin de sa carte.
- **« Rattacher un papier existant »** sur la page d'un objet : la liste des
  autres papiers (avec recherche), un toucher rattache. Un papier déjà dans un
  autre objet y est signalé et change d'objet.
- **« Modifier l'objet »** remplace « Renommer » : nom et type, et
  « Supprimer l'objet » (ses papiers restent, sans objet). Créer un objet qui
  existe déjà ouvre celui qui existe.
- « Ajouter un papier » depuis la page d'un objet lui rattache toujours le
  nouveau papier.

Étape 13 ter (14 novembre 2026, retours de l'utilisateur après essai sur
iPhone) :

- **Un papier à conserver n'a pas de date** (« pas besoin de date limite ») :
  le champ disparaît quand on choisit « À conserver », et une date saisie
  avant est ignorée. Remplace le « Valable jusqu'au » de l'étape 13. Les
  fiches anciennes qui en ont une la gardent jusqu'à leur prochain
  enregistrement.
- **Catégories personnelles** : « + Nouvelle » à droite de « Catégorie »
  dans la fiche (sans allonger la fiche), ou « Nouvelle catégorie » dans
  « ⋮ ». Un nom (24 caractères) et une couleur parmi dix bien distinctes de
  celles de base, ou « Autre couleur » (sélecteur du téléphone). Créée depuis
  la fiche, elle y est choisie aussitôt. Elle se range avant « Autre », qui
  reste en dernier. Dans « ⋮ », la rubrique « Catégories » liste celles
  ajoutées (avec leur nombre de papiers) : toucher pour renommer, changer de
  couleur ou supprimer (ses papiers passent dans « Autre »). Un nom déjà pris
  (« santé ») est refusé. Les six catégories de base ne se modifient pas.
- **« Objet concerné » est une liste** : « Aucun », les objets existants,
  puis « + Nouvel objet… », qui fait apparaître un champ pour le nommer.
  Remplace la saisie libre avec suggestions, que l'iPhone ne montrait pas.

Étape 13 quater (14 novembre 2026, retours de l'utilisateur : « réduire les
onglets, sinon ça va faire une longue liste », et « si j'ai 2 voitures, 2
téléphones, 2 chiens, il faudrait des catégories aux objets ») :

- **Chaque groupe se replie** d'un toucher sur son titre (« À traiter »,
  « Prélevés automatiquement », « À conserver », « Traités »), avec une petite
  flèche et le nombre de papiers. L'appareil s'en souvient, page par page
  (la page des papiers et celle d'un objet ont chacune leurs réglages).
  **« Traités » est replié d'office** sur la page des papiers : c'est la liste
  qui s'allonge sans fin. **Pendant une recherche, tout est déplié**, pour
  qu'aucun résultat ne reste caché. Un titre masqué (un seul groupe) ne
  replie jamais sa liste.
- **La page « Objets » est rangée par type**, une rubrique repliable par
  type : Véhicules, Logements, Appareils, Animaux, Personnes, Autres. Deux
  types ajoutés : **Animal** (un chien, un chat : vétérinaire, assurance) et
  **Personne** (un enfant, un parent : ses papiers à part). Un objet né d'un
  papier, sans type choisi, est dans « Autres » ; « Modifier l'objet » lui en
  donne un.

## Structure proposée pour la suite (à valider)

L'application n'est plus seulement une boîte à papiers : elle a des
échéances, des abonnements, des objets et des papiers à garder. La page
« Papiers » empile maintenant tout (résumé, total, rappel de sauvegarde,
recherche, catégories, quatre groupes). Proposition, en trois onglets :

1. **« À faire »** (l'accueil) : les trois cases, les dépenses régulières,
   ce qui est à traiter et les prélèvements. Ce qui bouge, rien d'autre.
2. **« Classeur »** : tous les papiers, avec la recherche et les catégories ;
   les papiers à conserver d'abord, puis les archives (traités).
3. **« Objets »** : comme aujourd'hui.

Le bouton « Ajouter » ouvrirait la fiche réglée selon l'onglet (« À
conserver » depuis le Classeur, objet rempli depuis un objet). Pas de
changement dans les données. À faire seulement après accord de
l'utilisateur, avec une maquette avant.

## Ce qu'il reste pour la mise en ligne

1. **Historique nettoyé, fait le 12 novembre 2026.** L'adresse personnelle de
   l'utilisateur, qui figurait comme auteur du premier commit, a été remplacée
   par son adresse anonyme GitHub dans `main` et dans la branche de travail,
   avec son accord. Aucun fichier n'a changé. Les identifiants de tous les
   commits ont changé à cette occasion.
2. **Fusionner la pull request** qui apporte le travail dans `main`. Sans
   cela, une nouvelle session partirait d'une branche principale vide, sans
   `SPEC.md` ni `CLAUDE.md`.
3. **Deux réglages de l'utilisateur sur GitHub** : rendre le dépôt public
   (Settings, General, Danger Zone), puis activer Pages (Settings, Pages,
   « Deploy from a branch », branche `main`, dossier racine).
4. **Vérifier en ligne**, sur téléphone : installation, notifications,
   ouverture d'un PDF, sauvegarde.

## Notes techniques

À respecter dans les étapes suivantes.

- **Mise à jour de l'application (12 novembre 2026).** Après la mise en
  ligne du design, l'utilisateur voyait encore l'ancienne version, même en
  touchant « Recharger » : l'ancien service worker servait sa copie d'abord,
  et le navigateur réutilisait ses fichiers en mémoire (GitHub Pages les
  déclare valables 10 minutes). Désormais :
  - **le service worker prend le réseau d'abord** (attente maximale de 4 s),
    et sa copie ne sert que hors ligne ; il n'annonce plus de nouvelle
    version, puisqu'une page chargée en ligne est forcément à jour ;
  - **son cache s'appelle `mes-papiers-v2`** ; à l'activation, il supprime
    tout autre cache (donc les copies des anciennes versions). Changer ce nom
    chaque fois que le fonctionnement du service worker change ;
  - **`index.html` charge ses fichiers avec `?v=…`** (`style.css`,
    `store.js`, `reminders.js`, `backup.js`, `app.js`). **À chaque mise en
    ligne, changer ce numéro sur les cinq lignes**, sinon le navigateur peut
    garder l'ancien fichier jusqu'à 10 minutes ;
  - **le service worker est enregistré avec `updateViaCache: 'none'`**, pour
    que sa propre mise à jour ne passe jamais par le cache du navigateur.
  Pour passer des anciennes versions à celle-ci, il faut toucher
  « Recharger » une ou deux fois, une seule fois.
- **Pages suivantes** : rangées dans la table `files` sous la clé
  `<id du papier>#<suffixe>`, avec `paperId` ; la fiche garde leur ordre dans
  `extraPages`. `PaperStore.addPage`, `removePage`, `getPages` ; `remove`
  efface aussi les pages. Dans la sauvegarde : `pages: [{ file, type }]` par
  papier, fichiers `…-page-2.pdf`.
- **Réglages de l'appareil** dans `localStorage` : `mes-papiers.replie`, `mes-papiers.theme`,
  `mes-papiers.rappel-sauvegarde` (fin du « Plus tard »), en plus de la date
  de dernière sauvegarde.
- **Notes** : champ `note` (texte, 2 000 caractères au plus) sur toutes les
  fiches ; `noFile: true` pour un papier sans document, qui n'a alors aucune
  entrée dans la table `files` (`PaperStore.add(paper, null)`), `size` 0 et
  pas de pages. Dans la sauvegarde, une telle fiche a `file: null`.
- **Échéances qui reviennent (étape 11)** : champs `amount` (centimes,
  entier, ou `null`), `repeat` (0, 1, 3, 12 ou 24 mois), `repeatDay` (jour du
  mois d'origine, 1 à 31, ou `null`), `autoPay` (booléen) et `history`
  (`[{ due, doneAt }]`, 24 au plus). Pas de montée de version de la base : les
  fiches anciennes n'ont simplement pas ces champs. Le calcul des dates est
  dans `reminders.js` (`nextDue`, `currentDue`, `needsAction`) ; `pending` et
  `upcoming` ignorent les prélèvements automatiques. Les prélèvements dépassés
  sont avancés à chaque `refresh()` d'`app.js`, y compris au retour sur
  l'application. La sauvegarde garde ces champs et les revérifie à la
  restauration (format toujours en version 1 : champs ajoutés seulement).
- **Objets (étape 12)** : champ `thing` (texte, 60 caractères au plus, chaîne
  vide si aucun). Regroupement en mémoire dans `app.js` (`thingKey`,
  `collectThings`). Pages : `view.page` vaut `papers`, `things` ou `thing`
  (`view.thing` = clé de l'objet), lue dans l'adresse par `readRoute()` et
  changée par `goTo()` (historique du navigateur). Sauvegardé et revérifié à
  la restauration.
- **Papiers à conserver (étape 13)** : champ `keep` (booléen). Dans
  `reminders.js`, `needsAction()` (résumé, « À traiter ») exclut les papiers
  à conserver ; `remindable()` (rappels) les garde. Un papier à conserver n'a
  jamais `repeat` (forcé à 0 à l'enregistrement et à la restauration).
- **Objets créés à la main (étape 13 bis)** : la base passe en **version 2**,
  avec une troisième table `things` `{ id, name, kind, createdAt }`, `kind`
  parmi `vehicule`, `logement`, `appareil`, `autre`. La montée de version ne
  touche à rien d'autre. Un papier reste rattaché par son nom (`thing`) ; un
  objet est la réunion des fiches `things` et des noms portés par les papiers
  (`collectThings`), la fiche donnant le nom et le type. `PaperStore` :
  `listThings`, `putThing`, `removeThing`. Sauvegarde : liste `things` dans
  `mes-papiers.json` (format toujours en version 1, champ ajouté).
- **Catégories personnelles (étape 13 ter)** : base en **version 3**, table
  `categories` `{ id, label, color, createdAt }`, `id` commençant par `c-`,
  `color` en `#rrggbb`. `PaperStore` : `listCategories`, `putCategory`,
  `removeCategory(id, fallback)` (qui range ses papiers dans `fallback` dans
  la même transaction). Leurs couleurs passent par une feuille de style
  construite par le script (`CSSStyleSheet` + `adoptedStyleSheets`), que la
  règle de sécurité autorise, contrairement à un `<style>` dans la page ; sur
  une couleur claire, le texte de la bande du calendrier passe en foncé.
  `CATEGORIES` dans `app.js` est désormais variable (base + personnelles).
  Sauvegarde : liste `categories` dans `mes-papiers.json`, restaurée avant
  les papiers.
- **Groupes repliables** : réglage de l'appareil `mes-papiers.replie`
  (`localStorage`), objet `{ "<page>:<groupe>": vrai/faux }`, par exemple
  `papers:done`, `thing:keep`, `things:kind-animal`. Types d'objets :
  `vehicule`, `logement`, `appareil`, `animal`, `personne`, `autre`.
- **`icons/chevron.svg`** : la flèche de la liste « Revient » (une image, la
  règle de sécurité interdisant les images `data:`).
- **Polices** : `fonts/` contient les fichiers `.woff2` et leurs licences ; la
  règle de sécurité autorise `font-src 'self' file:`.
- **Volet de droite** : sur grand écran, la fiche d'un papier est le même
  `<dialog>` que sur téléphone, ouvert sans être modal (`show()`, classe
  `as-panel`) ; l'ajout d'un papier reste une fenêtre par-dessus. Le ménage à
  la fermeture est fait tout de suite (`closeSheet()`), pas à l'annonce
  `close` du navigateur, qui arrive après l'ouverture du papier suivant.
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
- **La règle de sécurité (CSP) de `index.html` s'impose au code.** Pas de
  `<script>` ni de `<style>` écrits dans la page, pas d'attribut `style="…"`,
  pas de `fetch` depuis la page (le service worker, lui, peut), pas d'image en
  `data:`. Toute nouvelle sorte de ressource doit y être ajoutée : une police
  embarquée, par exemple, demandera `font-src 'self' file:`. `file:` y figure
  pour l'ouverture par double-clic.
- **`store.js` est la seule porte d'accès aux données.** Interface asynchrone :
  `PaperStore.list()`, `add(paper, file)`, `update(id, changes)`, `remove(id)`,
  `getFile(id)`, `requestPersistence()`. `app.js` ne touche jamais à IndexedDB.
- **Base IndexedDB `mes-papiers`, version 2 (trois tables depuis l'étape 13
  bis, voir plus haut)** ; les deux premières, indexées par `id` :
  - `papers` : la fiche `{ id, category, organisation, dueDate, done, doneAt,
    reminded, fileName, type, size, createdAt, updatedAt, thumbnail }`, plus
    `note`, `noFile`, `extraPages` et les champs de l'étape 11 ;
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
  donne (`check(notify)`).
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
- **« Ajouter au calendrier » retiré partout** (13 novembre 2026, à la
  demande de l'utilisateur). Dans l'application installée sur iPhone, aucune
  voie ne marchait (feuille de partage sans Calendrier, ouverture directe sur
  une page blanche, fichier introuvable dans Fichiers) ; l'utilisateur a
  préféré retirer l'option aussi sur ordinateur. Les rappels passent
  uniquement par les notifications. Sous la date limite reste la phrase
  « Rappels 7 jours avant et la veille ».
- **Installation sur téléphone** : elle demande une adresse en `https`, donc
  la mise en ligne (étape 6). Vérifiée ici sur ordinateur seulement.
- **Feuille de partage sur iPhone** (sauvegarde) : écrite d'après
  la documentation et vérifiée en simulation, jamais sur un vrai iPhone.
- **Taille de la sauvegarde** : l'archive est assemblée par le navigateur
  avant d'être remise. Sans souci pour quelques centaines de papiers ; à
  surveiller au-delà de quelques centaines de Mo sur un téléphone. Limite du
  format : 4 Go.
- **Règle de sécurité et ouverture par double-clic** : vérifiée dans Chromium
  seulement. Si Firefox ou Safari refusaient de charger l'application en
  `file://`, c'est elle qu'il faudrait regarder en premier.
- **Après la réécriture de l'historique**, l'ancien premier commit reste un
  temps récupérable sur GitHub par qui connaîtrait son identifiant exact, que
  personne d'autre n'a vu. Le support GitHub peut le purger sur demande.
