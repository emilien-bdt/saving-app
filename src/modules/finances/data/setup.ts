import { db } from "@/shared/lib/db";
import { todayIso } from "@/shared/lib/today";
import { DEFAULT_CATEGORIES, type DefaultCategoryKey } from "../default-categories";

/** A new account starts with the default categories and a current account at 0 €. */
export async function setupFinancesForUser(userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    if ((await tx.category.count({ where: { userId } })) === 0) {
      const ids = new Map<DefaultCategoryKey, string>();
      const siblings = new Map<string, number>();
      for (const { key, parentKey, ...category } of DEFAULT_CATEGORIES) {
        const parentId = parentKey ? (ids.get(parentKey) ?? null) : null;
        const sortOrder = siblings.get(parentId ?? "root") ?? 0;
        siblings.set(parentId ?? "root", sortOrder + 1);
        const created = await tx.category.create({ data: { ...category, userId, parentId, sortOrder }, select: { id: true } });
        ids.set(key, created.id);
      }
    }
    if ((await tx.account.count({ where: { userId } })) === 0) {
      await tx.account.create({
        data: {
          userId,
          name: "Compte Courant",
          type: "CHECKING",
          color: "#2563eb",
          icon: "wallet",
          initialBalanceDate: new Date(`${todayIso()}T00:00:00Z`),
        },
      });
    }
  });
}
