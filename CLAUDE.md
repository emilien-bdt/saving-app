# Save – Application de gestion de vie perso

## Vision
Application web personnelle pour gérer plusieurs domaines de ma vie, en remplacement d'un fichier Excel peu pratique.
Elle doit être **plus simple et plus rapide qu'Excel** : saisir une dépense doit prendre moins de 10 secondes, y compris sur téléphone.

Modules prévus (par ordre de priorité) :
1. **Finances** (MVP) : comptes, transactions, catégories, budgets mensuels, tableau de bord
2. **Repas** : planning de la semaine, recettes, liste de courses
3. *(plus tard)* : [à compléter : santé, tâches, abonnements, objectifs…]

## Utilisateur
- Un seul utilisateur : moi (pas de multi-comptes au départ, mais une authentification simple pour protéger mes données)
- Usage : ordinateur **et** téléphone (application en ligne)
- Niveau technique : avancé → explications concises
- Langue de l'interface : français ; devise : EUR ; format de date : JJ/MM/AAAA

## Stack technique
- Next.js 16 (App Router) + TypeScript strict (`noUncheckedIndexedAccess`)
- Tailwind CSS 4 + shadcn/ui (composants dans `src/shared/ui`)
- Base de données : PostgreSQL via Prisma 7 (adapter `pg`) ; Docker en local, Neon en production
- Validation : Zod ; dates : date-fns (locale `fr`)
- Graphiques : Recharts
- Tests : Vitest
- Hébergement : Vercel + Neon

## Architecture
- Chaque domaine est un **module indépendant** (`/src/modules/finances`, `/src/modules/repas`…) avec son propre modèle de données, ses pages et sa logique.
- Le code partagé (UI, auth, utilitaires) va dans `/src/shared`.
- Un module = `src/modules/<nom>` (`domain/` logique pure testée, `data/` accès Prisma, `actions/` Server Actions + Zod, `components/`, `module.ts`) + son fichier `prisma/schema/<nom>.prisma` + une ligne dans `src/modules/registry.ts`.
- Les fichiers de `src/app` restent fins : ils importent depuis les modules.
- Ajouter un module ne doit pas obliger à modifier les autres.
- Base : tables préfixées par module (`finances_*`) ; dates calendaires en `@db.Date` (objets `Date` à minuit UTC, cf. `domain/period.ts`) ; règles métier doublées par des contraintes CHECK écrites à la main dans le SQL des migrations (à conserver dans les migrations futures).
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

## Commandes
- `npm run db:up` / `db:down` : démarrer / arrêter Postgres (Docker)
- `npm run dev` : serveur de développement (http://localhost:3000)
- `npm test` (`test:watch`), `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run db:migrate` : créer/appliquer une migration ; `db:generate` : régénérer le client ; `db:studio` ; `db:seed` : données de départ (idempotent)
- `npm run import:excel -- [--dry-run] [--replace] Budget-2024.xlsm …` : import des fichiers Excel (rapport + contrôle des soldes mois par mois)
- `npm run auth:hash` : choisit le mot de passe ; écrit `AUTH_PASSWORD_HASH` + `AUTH_SECRET` dans `.env` et les affiche pour Vercel

## Décisions
- 16/11/2026 — Hébergement Vercel + Neon ; PostgreSQL dès le départ (au lieu de SQLite) pour éviter une migration.
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
- 16/11/2026 — Modèle Finances : virement = une seule ligne (`accountId` → `toAccountId`, sans catégorie) ; soldes jamais stockés (calculés dans `domain/balances.ts`) ; solde d'un compte parent = le sien + ses pockets ; Épargne = comptes `SAVINGS` ; Tendance = revenus − dépenses (virements neutres).
- 16/11/2026 — Suppression d'un `ImportBatch` = annulation de l'import (cascade) ; `importRef` unique rend la ré-importation idempotente.
- 16/11/2026 — Import Excel : lecteur .xlsx maison (zip + XML, sans dépendance) ; plages de lignes lues dans les formules SUMIF des en-têtes ; 3 mises en page (Livrets jusqu'à 03/2026, transition 04/2026, Pockets Revolut dès 05/2026) ; comptes importés : Compte Courant, Livret A et Livret Jeune (archivés), Matelas de sécurité, pockets Appartement et Voiture ; virements datés fin de mois (`dayUnknown`) ; formules `=a-b` (remboursements) gardées en une transaction nette ; contrôle : soldes « Actuel » recalculés = cellules Excel (95/95 au 16/11/2026).
- 16/11/2026 — Transactions : page `/finances/transactions?mois=AAAA-MM` (filtres `compte`, `categorie`, `statut=prevue|pointee`, `q`) ; vue Détaillée par défaut, choix mémorisé (cookie `finances_vue`) ; nouvelle saisie = dépense pointée du jour sur le Compte Courant ; un libellé connu pré-remplit sa catégorie habituelle ; « aujourd'hui » = fuseau Europe/Paris (`shared/lib/today.ts`).
- 16/11/2026 — Changement de cap : séparer **Piloter** (tableau de bord mensuel visuel, page d'accueil de Finances, lecture seule pour l'instant), **Saisir** (formulaire rapide, accessible partout via « + ») et **Journal** (liste filtrable actuelle). Même navigation et même usage sur iPhone et ordinateur (mise en page responsive, pas d'écran spécifique au mobile).
- 16/11/2026 — Budgets mensuels intégrés au MVP : un montant par catégorie, valable à partir d'un mois (historique conservé), affichés dans le tableau de bord (consommé / reste / projection fin de mois).
