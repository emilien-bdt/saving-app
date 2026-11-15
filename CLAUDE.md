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

## Règles métier – Finances
- Les montants sont stockés **en centimes (entiers)**, jamais en nombres à virgule.
- Une transaction a : date, montant, type (dépense / revenu / virement), compte, catégorie, libellé, note facultative.
- Les catégories sont personnalisables (nom, couleur, icône) et peuvent avoir des sous-catégories.
- Les transactions récurrentes (loyer, abonnements, salaire) doivent pouvoir être générées automatiquement.
- L'import de mon fichier Excel existant est indispensable (voir `docs/exemple-excel.csv`).

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
- `npm run db:migrate` : créer/appliquer une migration ; `db:generate` : régénérer le client ; `db:studio`

## Décisions
- 16/11/2026 — Hébergement Vercel + Neon ; PostgreSQL dès le départ (au lieu de SQLite) pour éviter une migration.
- 16/11/2026 — Transaction : une seule date ; statut `PLANNED` (prévue) / `CLEARED` (pointée) → soldes Actuel et Prévisionnel.
- 16/11/2026 — Comptes et pockets (façon Revolut : `Account.parentId`) ajoutables, modifiables, archivables ; un compte avec transactions s'archive au lieu d'être supprimé.
- 16/11/2026 — Tickets restaurant : revenu sur le Compte Courant (catégorie dédiée).
- 16/11/2026 — Achats multiples (boulangerie…) : une transaction par achat en base, regroupés à l'affichage par libellé normalisé + catégorie (vue Groupée / Détaillée) ; les formules Excel `=a+b+…` sont éclatées à l'import.
- 16/11/2026 — Import Excel : fichiers 2024 à 2026 uniquement ; anciens comptes créés archivés ; fichiers réels jamais commités.
- 16/11/2026 — Budgets, stats et graphique de budget : hors MVP (phase bonus).
- 16/11/2026 — Récurrences gérées dans Paramètres › Récurrences ; générées en statut « prévue ».
- 16/11/2026 — Authentification : mot de passe unique.
