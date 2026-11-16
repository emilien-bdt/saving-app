/**
 * Initial data (idempotent: existing rows are left untouched, so edits made
 * in the app are never overwritten). Run with `npm run db:seed`.
 */
import "dotenv/config";
import { db } from "../src/shared/lib/db";

const INITIAL_BALANCE_DATE = new Date("2024-08-01T00:00:00Z");

const accounts = [
  { name: "Compte Courant", type: "CHECKING", color: "#2563eb", icon: "wallet" },
  { name: "Livret A", type: "SAVINGS", color: "#16a34a", icon: "piggy-bank" },
  { name: "Livret Jeune", type: "SAVINGS", color: "#0d9488", icon: "piggy-bank" },
] as const;

type CategorySeed = {
  name: string;
  kind: "EXPENSE" | "INCOME";
  color: string;
  icon: string;
  children?: { name: string; icon: string }[];
};

// Same names as the blocks of the Excel file (mapping used by the import, step 4).
const categories: CategorySeed[] = [
  { name: "Apports", kind: "INCOME", color: "#16a34a", icon: "hand-coins" },
  { name: "Tickets restaurant", kind: "INCOME", color: "#65a30d", icon: "utensils" },
  {
    name: "Charges fixes",
    kind: "EXPENSE",
    color: "#7c3aed",
    icon: "house",
    children: [
      { name: "Logement, charges, assurances", icon: "house" },
      { name: "Abonnements", icon: "repeat" },
      { name: "Crédits, impôts, frais bancaires", icon: "landmark" },
    ],
  },
  { name: "Courses, alimentation, repas travail", kind: "EXPENSE", color: "#ea580c", icon: "shopping-cart" },
  { name: "Sorties, bar, restaurant, loisirs", kind: "EXPENSE", color: "#db2777", icon: "party-popper" },
  { name: "Voiture, déplacement, parking", kind: "EXPENSE", color: "#0891b2", icon: "car" },
  { name: "Autres dépenses", kind: "EXPENSE", color: "#64748b", icon: "shapes" },
];

async function ensureCategory(
  data: { name: string; kind: "EXPENSE" | "INCOME"; color: string; icon: string; sortOrder: number },
  parentId: string | null,
): Promise<string> {
  const existing = await db.category.findFirst({ where: { name: data.name, kind: data.kind, parentId } });
  if (existing) return existing.id;
  const created = await db.category.create({ data: { ...data, parentId } });
  return created.id;
}

async function main(): Promise<void> {
  for (const [sortOrder, account] of accounts.entries()) {
    const existing = await db.account.findFirst({ where: { name: account.name, parentId: null } });
    if (!existing) {
      await db.account.create({ data: { ...account, sortOrder, initialBalanceDate: INITIAL_BALANCE_DATE } });
    }
  }

  for (const [sortOrder, { children = [], ...category }] of categories.entries()) {
    const parentId = await ensureCategory({ ...category, sortOrder }, null);
    for (const [childOrder, child] of children.entries()) {
      await ensureCategory(
        { ...child, kind: category.kind, color: category.color, sortOrder: childOrder },
        parentId,
      );
    }
  }

  const [accountCount, categoryCount] = await Promise.all([db.account.count(), db.category.count()]);
  console.log(`Seed OK : ${accountCount} comptes, ${categoryCount} catégories.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
