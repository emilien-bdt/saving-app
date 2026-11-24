/**
 * Initial data (idempotent: existing rows are left untouched, so edits made
 * in the app are never overwritten). Run with `npm run db:seed`.
 */
import "dotenv/config";
import { DEFAULT_CATEGORIES, type DefaultCategoryKey } from "../src/modules/finances/default-categories";
import { getCliOwner } from "../src/shared/lib/cli-owner";
import { db } from "../src/shared/lib/db";

const INITIAL_BALANCE_DATE = new Date("2024-08-01T00:00:00Z");

const accounts = [
  { name: "Compte Courant", type: "CHECKING", color: "#2563eb", icon: "wallet" },
  { name: "Livret A", type: "SAVINGS", color: "#16a34a", icon: "piggy-bank" },
  { name: "Livret Jeune", type: "SAVINGS", color: "#0d9488", icon: "piggy-bank" },
] as const;

async function main(): Promise<void> {
  const { userId } = await getCliOwner();
  for (const [sortOrder, account] of accounts.entries()) {
    const existing = await db.account.findFirst({ where: { userId, name: account.name, parentId: null } });
    if (!existing) {
      await db.account.create({ data: { ...account, userId, sortOrder, initialBalanceDate: INITIAL_BALANCE_DATE } });
    }
  }

  const ids = new Map<DefaultCategoryKey, string>();
  const siblingCount = new Map<string, number>();
  for (const { key, parentKey, ...category } of DEFAULT_CATEGORIES) {
    const parentId = parentKey ? (ids.get(parentKey) ?? null) : null;
    const sortOrder = siblingCount.get(parentId ?? "root") ?? 0;
    siblingCount.set(parentId ?? "root", sortOrder + 1);

    const existing = await db.category.findFirst({ where: { userId, name: category.name, kind: category.kind, parentId } });
    const id = existing?.id ?? (await db.category.create({ data: { ...category, userId, parentId, sortOrder } })).id;
    ids.set(key, id);
  }

  const [accountCount, categoryCount] = await Promise.all([db.account.count({ where: { userId } }), db.category.count({ where: { userId } })]);
  console.log(`Seed OK : ${accountCount} comptes, ${categoryCount} catégories.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
