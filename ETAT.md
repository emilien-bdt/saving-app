# État du site — Save

> Photo de l'avancement, mise à jour à chaque étape (dernière mise à jour : 24/11/2026, étape 18a : couleurs iOS clair / sombre).
> Les règles et décisions sont dans `CLAUDE.md` ; ce fichier dit **où on en est**.

## En bref

| | |
|---|---|
| Modules en service | **Accueil** (menu + tableau de bord), **Finances**, **To do**, **Repas** (grille, génération, plats et accompagnements, ingrédients, liste de courses) |
| Environnement | **En ligne** : https://save.emilienbourdet.fr (VPS OVH, compose principal de `/Serveur OVH - minecraft`, dossier `save` = clone git) ; mise à jour = `git pull` + `docker compose up -d --build save-migrate save-app` (voir `deploy/README.md`). Local (`npm run dev`) = tests uniquement. |
| Git | branche `main`, poussée sur GitHub (`emilien-bdt/saving-app`) ; le serveur fait `git pull` |
| Données | **Base de référence = serveur** (base locale copiée le 24/11/2026 : finances 921 transactions, To do, Repas 524 repas / 171 plats). Saisir en ligne ; ne plus restaurer la base locale sur le serveur. |
| Chantier en cours | **Refonte design iOS + multi-comptes / foyers** (cadré le 24/11/2026) : 18a faite, 18b à suivre |
| Tests | 255 tests de logique (Vitest), lint au vert ; typecheck à relancer sur le Mac après `npm run db:migrate` (client Prisma To do) |

## Ce qui fonctionne

### Apparence
- Palette façon iOS, **clair / sombre selon le réglage de l'appareil** (étape 18a), police système ; barre d'état de l'iPhone assortie.
- Repas garde son style « pâte à modeler », toujours en clair, jusqu'à sa refonte (phase 3).

### Accès
- Connexion par mot de passe unique (`/login`), session de 30 jours, déconnexion dans Paramètres.
- `npm run auth:hash` choisit le mot de passe et remplit `.env`.
- Installable sur iPhone (« Sur l'écran d'accueil »), s'ouvre sur l'Accueil (`/`).

### Accueil — `/`
- Tuiles de toutes les apps (Finances, To do).
- Tableau de bord : un widget par module.
  - Finances : total, tendance, dépenses du mois en cours (réel + prévu).
  - To do : tâches en retard + du jour (cochables directement), compteurs aujourd'hui / 7 jours.
- ⚠️ Rendu pas encore validé à l'écran.

### Navigation
- Navigation commune à tous les modules : sur ordinateur, « Save » (→ Accueil) + sélecteur d'app + pages du module ; sur iPhone, onglets **Accueil** + pages du module.
- Finances : **Piloter · Journal · Paramètres**, bouton **+ Saisir** sur toutes les pages.
- To do : **Tâches · Listes**, bouton **+ Tâche** sur toutes les pages.

### Piloter — `/finances` (lecture seule)
- Navigation par mois (`?mois=AAAA-MM`).
- Indicateurs : Total, Épargne (hors pockets), Pockets, Tendance (réel et prévu, écart vs mois précédent).
- Intérêts journaliers inclus dans les soldes, la Tendance et les Apports.
- « Où part l'argent » : barres par catégorie, part du mois, écart à la moyenne 6 mois ; clic → Journal filtré.
- Comptes en trois blocs **Courant / Épargne / Pockets**, chacun avec son total (début du mois, évolution, solde actuel, prévu) et le détail par compte.
- Évolution 12 mois (solde total + tendance mensuelle), en SVG.
- Cartes : Apports, À pointer, Virements internes, Plus gros postes.
- ⚠️ Rendu visuel pas encore validé à l'écran (calculs vérifiés sur l'Excel).

### Saisir — formulaire « + »
- Montant au clavier numérique, Dépense / Revenu / Virement, catégories en puces (les plus utilisées d'abord).
- Suggestions de libellés : un libellé connu pré-remplit sa catégorie habituelle.
- Aujourd'hui / Hier / date, compte, statut (pointée par défaut), note facultative.
- « Ajouter et continuer » pour enchaîner.

### Journal — `/finances/transactions`
- Liste du mois, vues **Détaillée** (par jour) et **Groupée** (par libellé), choix mémorisé.
- Filtres : recherche, compte, catégorie, statut.
- Pointage en un geste ; modification et suppression d'une transaction.
- Ligne calculée **Intérêts** par compte d'épargne (gagnés jusqu'à hier + à venir d'ici la fin du mois), non modifiable.

### Paramètres — `/finances/parametres`
- **Comptes** : ajouter un compte (courant, épargne) ou un pocket, renommer, couleur, icône, archiver / désarchiver, supprimer s'il n'a jamais servi, ordre ↑↓. Un nouveau compte démarre à 0 €.
- **Intérêts journaliers** (comptes d'épargne) : historique des taux « à partir du », ajout ou suppression même dans le passé ; taux en cours affiché dans la liste.
- Catégories (**lecture seule** pour l'instant), déconnexion.

### To do — `/todo`
- Tâches à faire groupées : En retard, Aujourd'hui, Demain, Cette semaine, Plus tard, Sans date ; prioritaires en tête.
- Filtre par liste (Toutes, chaque liste, Sans liste).
- Cocher d'un geste ; toucher une tâche pour la modifier ou la supprimer.
- **Terminées** repliables (30 plus récentes), « Effacer les terminées ».
- Saisie « + » : titre, Aujourd'hui / Demain / Sans date / date, Prioritaire, liste, note ; « Ajouter et continuer ».
- **Listes** (`/todo/listes`) : ajouter, renommer, couleur, ordre ↑↓, supprimer (les tâches restent, sans liste).
- ⚠️ Rendu pas encore validé à l'écran.

### Repas — `/repas`
- Grille de la semaine (lundi → dimanche, midi et soir), navigation par semaine (`?semaine=AAAA-Wss`).
- Case : plat, reste (↺, pré-rempli avec le repas précédent) ou absent / dehors ; note facultative.
- **Générer / Regénérer** : remplit les cases vides ou proposées depuis l'historique ; ↻ sur une case pour un autre plat ; cadenas = validé, jamais touché ; « Tout valider ».
- Glisser-déposer par la poignée ⋮⋮ (déplacer ou échanger), aussi sur iPhone.
- « + Repas » partout (date + créneau au choix).
- Widget Accueil : midi, soir, demain soir, repas prévus / validés de la semaine.
- Style « pâte à modeler » (feuille `components/clay.css`, classes `clay-*`), cases agrandies, bouton 🗑 sur chaque repas.
- **Plats** (`/repas/plats`) : recherche, filtres (à compléter, doublons probables, archivés), fusion en un geste, éditeur (nom, ingrédients pour un repas à 2 avec quantité / unité / rayon du drive, archiver, fusionner, supprimer si jamais mangé). Ingrédients pré-remplis d'après les courses des Excel (« suggéré » à valider).
- Repas = plat (facultatif) + **accompagnements** (chips, salade, concombre, feta…, liste dans Repas › Paramètres) ; la génération propose les accompagnements habituels du plat ; « Ce n'est pas un plat » dans Plats.
- **Courses** (`/repas/courses?semaine=`) : liste calculée depuis les repas (1 repas + 1 par reste prévu, quantités additionnées, arrondi au conditionnement, accompagnements par repas), basiques d'un geste (liste dans Repas › Paramètres), ajout manuel, rangée par rayon du drive, cochable, quantité modifiable, « déjà au placard », lien de recherche Courses U, copier / partager ; affichage compact. Widget Accueil : articles à acheter.
- Import des menus Excel : `npm run import:repas -- --replace ~/Documents/Ressources/Autres/Repas/*.xlsx` (48 fichiers → 47 semaines, 524 repas, 190 plats, 126 plats avec ingrédients suggérés) ; formats `repas-JJ-MM-AA` et `planning-menu-JJ-MM`.
- ⚠️ Rendu pas encore validé à l'écran.

### Import Excel
- `npm run import:excel -- [--dry-run] [--replace] Budget-2024.xlsm …`
- Rapport avec contrôle des soldes mois par mois ; ré-import sans doublon.

## Ce qui reste à faire (dans l'ordre)

### Chantier prioritaire — refonte design + multi-comptes (cadré et validé le 24/11/2026)
A. ~~Maquettes iPhone~~ (validées le 24/11/2026).
B. **Socle design iOS (étape 18)** : ~~18a couleurs, police, clair / sombre~~ ; 18b navigation (onglets des apps en bas, grand titre, contrôle segmenté, « + » en haut à droite), `Sheet` qui monte du bas pour les 6 formulaires, composants communs, tirer pour rafraîchir, transitions ; 18c nouvel Accueil (widgets avec taille et ordre, Repas + Courses séparés, pastille profil).
C. **Comptes, foyers, admin** : `User`, `Household`, invitations (admin → compte, membre → foyer), connexion email + mot de passe, page Admin (membres, modules par personne), Paramètres › Foyer (inviter, rejoindre, quitter) ; migration de mes données vers mon compte ; Repas / Courses / listes To do partagées rattachés au foyer, Finances et autres listes à la personne.
D. **Refonte module par module** : Repas (vue jour par jour sur iPhone), To do, Finances (Piloter repensé pour l'iPhone) ; gestes balayer pour cocher / supprimer.

### Ensuite
0. **Valider à l'écran** l'Accueil et To do (Repas validé le 24/11/2026).
0 bis. **Repas** : remplir les quantités pour 2 dans Plats (les suggestions Excel n'en ont souvent pas) et les conditionnements des ingrédients ; garder les fusions de plats lors d'un réimport.
1. **Budgets** : un montant par catégorie (valable à partir d'un mois), écran Paramètres › Budgets avec proposition = moyenne 6 mois, consommé / reste / projection dans Piloter.
2. **Catégories modifiables** : nom, couleur, icône, sous-catégories.
3. **Récurrences** : Paramètres › Récurrences, génération des opérations prévues en début de mois (le modèle `RecurringRule` existe déjà en base).
4. **Vue annuelle** (remplace l'onglet `stats` de l'Excel).
6. Plus tard : actions depuis Piloter (pointer, ajouter dans un bloc), To do : tâches récurrentes / sous-tâches, Repas : option Gemini (gratuit), envoi des invitations par email, chiffrement des données perso, quitter un foyer avec une copie.

## Limites connues

- Pas de mode hors ligne.
- Les montants négatifs ne sont pas saisissables (un remboursement = un revenu).
- Les catégories ne se modifient pas encore depuis l'app (seulement via `npm run db:studio`).
- Le solde initial d'un compte ne se modifie pas (choix) : on corrige par une opération ou un virement.
- Intérêts : base 365 jours (années bissextiles comprises), avant impôts ; un écart de quelques centimes avec Revolut reste possible.
- Environnement de Claude : pas d'installation de paquets, ni de Vitest natif (tests lancés avec Node), ni de `prisma generate` / `next typegen` ; l'app réelle se teste sur le Mac.
- Le projet est dans `Documents` (synchronisé iCloud) : iCloud peut retirer du disque des fichiers de `.git` (« Bus error » / « Resource deadlock avoided » côté Claude). Les retélécharger avant un commit ; à terme, sortir le projet du dossier synchronisé.

## Démarrer en local

```bash
npm run db:up
npm run dev
```
Puis http://localhost:3000 — Accueil. En usage réel : https://save.emilienbourdet.fr (PWA iPhone).

## Historique des étapes

| Étape | Commit | Contenu |
|---|---|---|
| 1 | `6175d69` | Initialisation (Next.js 16, Prisma 7, Tailwind 4, Vitest) |
| 2 | `339a7d7` | Authentification, PWA iOS |
| 3 | `47b9725` | Modèle de données Finances, calcul des soldes |
| 4 | `ae7c4b3` | Import des fichiers Excel 2024-2026 |
| 5 | `c51a5b4` | Journal des transactions, saisie rapide |
| 6 | `2f18829` | Piloter (tableau de bord), navigation commune |
| 7 | `4c3830f` | Comptes : blocs Courant / Épargne / Pockets, gestion dans Paramètres |
| 8 | `ff6ff6c` | Intérêts journaliers des comptes d'épargne (taux historisés, calcul à la volée) |
| 9 | `d2fb042` | Déploiement Docker sur serveur perso (Dockerfile, compose prod, nginx, sauvegardes) |
| 10 | `010fccf` | Accueil (menu des apps + tableau de bord), navigation commune entre apps |
| 11 | `d2ff47a` | Module To do : tâches, échéances, priorité, listes |
| 12 | `401405e` | Widgets de l'Accueil : Finances et To do |
| 13 | `9812cd0` | Module Repas : grille de la semaine, validation, glisser-déposer, génération maison |
| 14 | `ba46a7d` | Import des menus Excel (`npm run import:repas`) |
| — | `9f5b2ef` | Import repas : format planning-menu, jour sur un chiffre, « (reste) » |
| 15 | `df9c2e7` | Repas : style pâte à modeler, affichage agrandi, bouton supprimer (+ `e0cb601` feuille globale `clay-`) |
| 16 | `777df49` | Plats et ingrédients : catalogue (rayon, unité, conditionnement), fusion des doublons, suggestions Excel |
| 16 bis | `de930f5` | Repas = plat + accompagnements (découpe à l'import, génération avec accompagnements habituels) |
| 17 | `46ef92a` | Liste de courses de la semaine (calculée, basiques, manuel, rayons du drive, Courses U) + `1c00831` affichage compact |
| — | `df397fc` | Mise en ligne (24/11/2026) : serveur passé en clone git, base locale restaurée sur le serveur |
| 18a | (ce commit) | Design iOS : palette clair / sombre selon l'appareil, police système, couleurs sémantiques (`positive`, `warning`, couleurs d'app) |
