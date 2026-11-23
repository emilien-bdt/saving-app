# Save – Application de gestion de vie perso

> **État d'avancement : voir `ETAT.md`** (à mettre à jour à la fin de chaque étape).

## Vision
Application web personnelle pour gérer plusieurs domaines de ma vie, en remplacement d'un fichier Excel peu pratique.
Elle doit être **plus simple et plus rapide qu'Excel** : saisir une dépense doit prendre moins de 10 secondes, y compris sur téléphone.

Modules prévus (par ordre de priorité) :
1. **Finances** (MVP) : comptes, transactions, catégories, budgets mensuels, tableau de bord
2. **To do** : tâches, échéances, priorité, listes (en place depuis le 23/11/2026)
3. **Repas** : planning de la semaine, recettes, liste de courses
4. *(plus tard)* : [à compléter : santé, abonnements, objectifs…]

L'**Accueil** (`/`) réunit le menu de toutes les apps et un tableau de bord fait d'un widget par module.

## Utilisateur
- Un seul utilisateur : moi (pas de multi-comptes au départ, mais une authentification simple pour protéger mes données)
- Usage : ordinateur **et** téléphone (application en ligne)
- Niveau technique : avancé → explications concises
- Langue de l'interface : français ; devise : EUR ; format de date : JJ/MM/AAAA

## Stack technique
- Next.js 16 (App Router) + TypeScript strict (`noUncheckedIndexedAccess`)
- Tailwind CSS 4 + shadcn/ui (composants dans `src/shared/ui`)
- Base de données : PostgreSQL via Prisma 7 (adapter `pg`) ; Docker en local et en production
- Validation : Zod ; dates : date-fns (locale `fr`)
- Graphiques : SVG maison, sans dépendance (Recharts possible plus tard)
- Tests : Vitest
- Hébergement : serveur perso en Docker (`docker-compose.prod.yml`), derrière nginx + certbot (conteneurs) — https://save.emilienbourdet.fr ; procédure dans `deploy/README.md`

## Architecture
- Chaque domaine est un **module indépendant** (`/src/modules/finances`, `/src/modules/repas`…) avec son propre modèle de données, ses pages et sa logique.
- Le code partagé (UI, auth, utilitaires) va dans `/src/shared`.
- Un module = `src/modules/<nom>` (`domain/` logique pure testée, `data/` accès Prisma, `actions/` Server Actions + Zod, `components/`, `module.ts`) + son fichier `prisma/schema/<nom>.prisma` + une ligne dans `src/modules/registry.ts`.
- Les fichiers de `src/app` restent fins : ils importent depuis les modules.
- Ajouter un module ne doit pas obliger à modifier les autres.
- Accueil (`src/modules/hub`, pas un module) : tuiles des apps + widgets du registre (`AppModule.widget`, Server Component async facultatif, défini dans `components/home-widget.tsx` du module). Le registre importe donc du code serveur : **jamais importé côté client** ; la navigation reçoit des `NavApp` via `getNavApps()` (`src/modules/navigation.tsx`).
- Navigation commune `src/shared/navigation/module-nav.tsx` : chaque module fournit ses liens et son bouton « + » (barre haute + sélecteur d'app sur ordinateur, onglets « Accueil » + module sur iPhone).
- Base : tables préfixées par module (`finances_*`) ; dates calendaires en `@db.Date` (objets `Date` à minuit UTC, cf. `domain/period.ts`) ; règles métier doublées par des contraintes CHECK (ou triggers quand la règle lit une autre ligne) écrites à la main dans le SQL des migrations (à conserver dans les migrations futures).
- Auth (`src/shared/auth`) : `src/proxy.ts` redirige vers `/login` toute requête sans session valide ; **chaque Server Action commence par `await requireSession()`** (les actions sont des endpoints POST publics).

## Règles métier – Finances
- Les montants sont stockés **en centimes (entiers)**, jamais en nombres à virgule.
- Une transaction a : date, montant, type (dépense / revenu / virement), compte, catégorie, libellé, note facultative.
- Les catégories sont personnalisables (nom, couleur, icône) et peuvent avoir des sous-catégories.
- Les transactions récurrentes (loyer, abonnements, salaire) doivent pouvoir être générées automatiquement.
- L'import de mon fichier Excel existant est indispensable (`src/modules/finances/import/excel`, exemple anonymisé dans `__fixtures__/`).

## Conventions de code
- TypeScript strict, pas de `any`.
- Noms de variables et de fonctions en anglais, textes de l'interface en français.
- Petits composants réutilisables ; aucune logique métier dans les composants d'interface.
- Valider toutes les entrées utilisateur (Zod).
- Écrire des tests pour la logique métier (calculs de soldes, budgets, import).

## Méthode de travail
- Toujours **proposer un plan et attendre ma validation** avant de coder une nouvelle fonctionnalité.
- Avancer par petites étapes testables ; un commit git par étape, avec un message clair.
- Après chaque étape : me dire comment tester (commande à lancer, page à ouvrir).
- Si une demande est ambiguë, me poser la question plutôt que de deviner.
- Tenir ce fichier à jour quand une décision importante est prise (section « Décisions » ci-dessous).
- Mettre à jour `ETAT.md` à la fin de chaque étape (fonctionnalités, reste à faire, historique).

## Commandes
- `npm run db:up` / `db:down` : démarrer / arrêter Postgres (Docker)
- `npm run dev` : serveur de développement (http://localhost:3000)
- `npm test` (`test:watch`), `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run db:migrate` : créer/appliquer une migration puis régénérer le client (Prisma 7 ne le fait plus seul) ; `db:generate` : régénérer le client ; `db:studio` ; `db:seed` : données de départ (idempotent)
- `npm run import:excel -- [--dry-run] [--replace] Budget-2024.xlsm …` : import des fichiers Excel (rapport + contrôle des soldes mois par mois)
- `npm run auth:hash` : choisit le mot de passe ; écrit `AUTH_PASSWORD_HASH` + `AUTH_SECRET` dans `.env` et les affiche pour le `.env` du serveur

## Décisions
- 16/11/2026 — Hébergement Vercel + Neon (→ révisé le 17/11/2026 : serveur perso, voir plus bas) ; PostgreSQL dès le départ (au lieu de SQLite) pour éviter une migration.
- 16/11/2026 — Transaction : une seule date ; statut `PLANNED` (prévue) / `CLEARED` (pointée) → soldes Actuel et Prévisionnel.
- 16/11/2026 — Comptes et pockets (façon Revolut : `Account.parentId`) ajoutables, modifiables, archivables ; un compte avec transactions s'archive au lieu d'être supprimé.
- 16/11/2026 — Tickets restaurant : revenu sur le Compte Courant (catégorie dédiée).
- 16/11/2026 — Achats multiples (boulangerie…) : une transaction par achat en base, regroupés à l'affichage par libellé normalisé + catégorie (vue Groupée / Détaillée) ; les formules Excel `=a+b+…` sont éclatées à l'import.
- 16/11/2026 — Import Excel : fichiers 2024 à 2026 uniquement ; anciens comptes créés archivés ; fichiers réels jamais commités.
- 16/11/2026 — Budgets, stats et graphique de budget : hors MVP (phase bonus). → Révisé le 16/11/2026 : budgets intégrés au MVP (voir plus bas).
- 16/11/2026 — Récurrences gérées dans Paramètres › Récurrences ; générées en statut « prévue ».
- 16/11/2026 — Authentification : mot de passe unique.
- 16/11/2026 — Opérations Excel sans jour (achats étalés sur le mois) : importées au dernier jour du mois avec `dayUnknown = true`, affichées « plusieurs jours » ; pas à corriger.
- 16/11/2026 — Libellé = commerçant/source (obligatoire) ; détail facultatif dans `note` (ex. « Auchan - Herouville(Crêpes) » → label « Auchan - Herouville », note « Crêpes »).
- 16/11/2026 — PWA iOS (manifest, standalone), pas de mode hors ligne. Récurrences générées à l'ouverture du mois, idempotentes (unique règle + date d'occurrence).
- 16/11/2026 — Auth sans dépendance : hash scrypt (`node:crypto`) dans `AUTH_PASSWORD_HASH`, session = cookie httpOnly signé HMAC-SHA256 (Web Crypto), 30 jours ; la clé inclut le hash, donc changer de mot de passe déconnecte tous les appareils.
- 16/11/2026 — Modèle Finances : virement = une seule ligne (`accountId` → `toAccountId`, sans catégorie) ; soldes jamais stockés (calculés dans `domain/balances.ts`) ; pockets totalisés à part (ni dans leur compte ni dans l'Épargne) ; Épargne = comptes `SAVINGS` hors pockets (révisé le 16/11/2026, voir plus bas) ; Tendance = revenus − dépenses (virements neutres).
- 16/11/2026 — Suppression d'un `ImportBatch` = annulation de l'import (cascade) ; `importRef` unique rend la ré-importation idempotente.
- 16/11/2026 — Import Excel : lecteur .xlsx maison (zip + XML, sans dépendance) ; plages de lignes lues dans les formules SUMIF des en-têtes ; 3 mises en page (Livrets jusqu'à 03/2026, transition 04/2026, Pockets Revolut dès 05/2026) ; comptes importés : Compte Courant, Livret A et Livret Jeune (archivés), Matelas de sécurité, pockets Appartement et Voiture ; virements datés fin de mois (`dayUnknown`) ; formules `=a-b` (remboursements) gardées en une transaction nette ; contrôle : soldes « Actuel » recalculés = cellules Excel (95/95 au 16/11/2026).
- 16/11/2026 — Transactions : page `/finances/transactions?mois=AAAA-MM` (filtres `compte`, `categorie`, `statut=prevue|pointee`, `q`) ; vue Détaillée par défaut, choix mémorisé (cookie `finances_vue`) ; nouvelle saisie = dépense pointée du jour sur le Compte Courant ; un libellé connu pré-remplit sa catégorie habituelle ; « aujourd'hui » = fuseau Europe/Paris (`shared/lib/today.ts`).
- 16/11/2026 — Changement de cap : séparer **Piloter** (tableau de bord mensuel visuel, page d'accueil de Finances, lecture seule pour l'instant), **Saisir** (formulaire rapide, accessible partout via « + ») et **Journal** (liste filtrable actuelle). Même navigation et même usage sur iPhone et ordinateur (mise en page responsive, pas d'écran spécifique au mobile).
- 16/11/2026 — Budgets mensuels intégrés au MVP : un montant par catégorie, valable à partir d'un mois (historique conservé), affichés dans le tableau de bord (consommé / reste / projection fin de mois).
- 16/11/2026 — Pages : `/finances` = Piloter (tableau de bord, calculs dans `domain/dashboard.ts`), `/finances/transactions` = Journal, `/finances/parametres` ; navigation commune (barre haute sur ordinateur, barre d'onglets sur iPhone) avec « + Saisir » partout ; graphiques en SVG maison (pas de dépendance) ; `/` redirige vers le seul module tant qu'il n'y en a qu'un ; l'app iPhone s'ouvre sur `/finances`.
- 16/11/2026 — Comptes : trois blocs **Courant / Épargne / Pockets**, chacun avec son propre total (un pocket ne s'ajoute plus à son compte ni à l'Épargne) ; affichés dans Piloter (carte Comptes + indicateur Pockets), pas d'onglet ni de page de détail par compte. Gestion dans Paramètres › Comptes (ajouter, modifier, archiver/désarchiver, supprimer si inutilisé, ordre ↑↓). Un nouveau compte démarre à 0 € à sa date de création ; le solde initial n'est jamais modifiable, le solde n'évolue que par des opérations et virements. Pockets sur un seul niveau (trigger SQL `finances_account_pocket_depth`) ; type d'un pocket sans effet (stocké `SAVINGS`).
- 16/11/2026 — Intérêts journaliers (épargne Revolut, étape 8) : comptes d'épargne uniquement (pas les pockets) ; taux annuel historisé par compte (table `finances_interest_rate`, `rateBp` en points de base, unique compte + date, « à partir du », modifiable même dans le passé, même date = remplacé, 0 = arrêt) ; calcul dans `domain/interest.ts`, injecté comme transactions calculées (`computed`, jamais en base, jamais « à pointer », non modifiables) dans Piloter et le Journal ; intérêts calculés à la volée (jamais stockés, comme les soldes) : chaque jour, solde de fin de journée × taux / 365, **arrondi au centime chaque jour**, ajouté au solde du lendemain ; rien si solde ≤ 0 ; jusqu'à hier = Actuel, jusqu'à fin de mois = Prévisionnel ; une ligne calculée « Intérêts » par mois et par compte, comptée comme revenu dans la Tendance. Aucun intérêt saisi dans l'Excel (pas de doublon à gérer).
- 17/11/2026 — Déploiement sur mon serveur (au lieu de Vercel + Neon) : `save.emilienbourdet.fr` ; image Next.js `standalone` (`Dockerfile` multi-étapes) ; `docker-compose.prod.yml` = `save-db` (Postgres 17, aucun port publié) + `save-migrate` (`prisma migrate deploy` à chaque démarrage) + `save-app` (rejoint le réseau Docker du conteneur nginx, `PROXY_NETWORK`) ; vhost nginx + certbot fournis dans `deploy/nginx/` ; transfert par zip (sans `CLAUDE.md` ni `Claude outputs`) ; base initiale = `pg_dump` de la base locale ; sauvegarde quotidienne `deploy/backup.sh`.
- 23/11/2026 — Accueil `/` = menu des apps + tableau de bord (un widget par module, rien de spécifique à un module dans l'Accueil) ; plus de redirection vers Finances ; la PWA s'ouvre sur `/`. Pas de « + » sur l'Accueil (chaque module a le sien).
- 23/11/2026 — Module **To do** (`/todo`, tables `todo_*`) : tâche = titre, note facultative, échéance facultative (`@db.Date`), priorité normale / haute, liste facultative, `completedAt` (null = à faire) ; listes = nom unique (insensible à la casse), couleur, ordre ; supprimer une liste garde ses tâches (sans liste). Page groupée En retard / Aujourd'hui / Demain / Cette semaine (≤ 7 j) / Plus tard / Sans date ; tri : prioritaire, puis échéance, puis ancienneté. Nouvelle tâche = aujourd'hui, sans liste ; « Ajouter et continuer » par défaut. Pas de sous-tâches ni de récurrence pour l'instant.
- 23/11/2026 — Widgets : Finances = total, tendance, dépenses du mois en cours (réel + prévu) ; To do = tâches en retard + du jour, cochables depuis l'Accueil, et nombre à venir sous 7 jours.
