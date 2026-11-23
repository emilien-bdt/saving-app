# État du site — Save

> Photo de l'avancement, mise à jour à chaque étape (dernière mise à jour : 23/11/2026, étape 12).
> Les règles et décisions sont dans `CLAUDE.md` ; ce fichier dit **où on en est**.

## En bref

| | |
|---|---|
| Modules en service | **Accueil** (menu + tableau de bord), **Finances**, **To do** (Repas : pas commencé) |
| Environnement | Local (`npm run dev`, Postgres Docker) ; déploiement prêt pour https://save.emilienbourdet.fr (serveur perso, Docker + nginx) — **mise en ligne à faire** (`deploy/README.md`) |
| Git | branche `main`, commits non poussés (`git push` à faire) |
| Données | Excel 2024 → 2026 importé : 921 transactions (08/2024 → 12/2026), 6 comptes, soldes identiques à l'Excel (95/95 contrôles) |
| Tests | 220 tests de logique (Vitest), lint au vert ; typecheck à relancer sur le Mac après `npm run db:migrate` (client Prisma To do) |

## Ce qui fonctionne

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

### Import Excel
- `npm run import:excel -- [--dry-run] [--replace] Budget-2024.xlsm …`
- Rapport avec contrôle des soldes mois par mois ; ré-import sans doublon.

## Ce qui reste à faire (dans l'ordre)

0. **Valider à l'écran** l'Accueil et To do (`npm run db:migrate` d'abord).
1. **Budgets** : un montant par catégorie (valable à partir d'un mois), écran Paramètres › Budgets avec proposition = moyenne 6 mois, consommé / reste / projection dans Piloter.
2. **Catégories modifiables** : nom, couleur, icône, sous-catégories.
3. **Récurrences** : Paramètres › Récurrences, génération des opérations prévues en début de mois (le modèle `RecurringRule` existe déjà en base).
4. **Vue annuelle** (remplace l'onglet `stats` de l'Excel).
5. **Mise en ligne** sur le serveur (fichiers prêts, voir `deploy/README.md`) : DNS, `.env`, restauration de la base locale, certificat.
6. Plus tard : actions depuis Piloter (pointer, ajouter dans un bloc), To do : tâches récurrentes / sous-tâches, module **Repas**.

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
Puis http://localhost:3000 — Accueil (ou http://192.168.1.28:3000 depuis l'iPhone sur le même Wi-Fi).

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
