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
- Usage : [ordinateur / téléphone / les deux]
- Niveau technique : [débutant / intermédiaire / avancé] → adapte tes explications en conséquence
- Langue de l'interface : français ; devise : EUR ; format de date : JJ/MM/AAAA

## Stack technique
- [À valider lors de la phase de planification. Proposition par défaut :]
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Base de données : SQLite via Prisma (migration vers PostgreSQL possible plus tard)
- Graphiques : Recharts
- Tests : Vitest
- Hébergement : [en local uniquement / en ligne (Vercel, VPS…)]

## Architecture
- Chaque domaine est un **module indépendant** (`/src/modules/finances`, `/src/modules/repas`…) avec son propre modèle de données, ses pages et sa logique.
- Le code partagé (UI, auth, utilitaires) va dans `/src/shared`.
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
- [Seront remplies après l'initialisation du projet : dev, build, test, migration]

## Décisions
- [Journal des choix techniques et fonctionnels, avec la date]
