import { cache } from "react";
import { requireSession } from "@/shared/auth/server";
import { db } from "@/shared/lib/db";
import { buildLabelSuggestions } from "../domain/suggestions";
import type { AccountOption, CategoryOption, TransactionFormOptions } from "../view-models";

/** Accounts, categories (with their usage) and label suggestions for the entry form and the filters. */
export const getTransactionFormOptions = cache(async (): Promise<TransactionFormOptions> => {
  const { userId } = await requireSession();
  const [accounts, categories, categoryUsage, labelUsage] = await Promise.all([
    db.account.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.category.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { parent: { select: { name: true } }, _count: { select: { children: true } } },
    }),
    db.transaction.groupBy({ by: ["categoryId"], where: { userId }, _count: { _all: true } }),
    db.transaction.groupBy({
      by: ["labelKey", "label", "type", "categoryId"],
      where: { userId, type: { not: "TRANSFER" } },
      _count: { _all: true },
      _max: { date: true },
    }),
  ]);

  const names = new Map(accounts.map((account) => [account.id, account.name]));
  const accountOptions: AccountOption[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    displayName: account.parentId ? `${names.get(account.parentId) ?? "?"} › ${account.name}` : account.name,
    type: account.type,
    parentId: account.parentId,
    archived: account.archivedAt !== null,
  }));

  const usage = new Map(categoryUsage.map((row) => [row.categoryId, row._count._all]));
  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind,
    color: category.color,
    icon: category.icon,
    parentId: category.parentId,
    parentName: category.parent?.name ?? null,
    archived: category.archivedAt !== null,
    hasChildren: category._count.children > 0,
    usageCount: usage.get(category.id) ?? 0,
  }));

  const suggestions = buildLabelSuggestions(
    labelUsage.map((row) => ({
      labelKey: row.labelKey,
      label: row.label,
      type: row.type,
      categoryId: row.categoryId,
      count: row._count._all,
      lastDateIso: row._max.date?.toISOString().slice(0, 10) ?? "",
    })),
  );

  const defaultAccount =
    accountOptions.find((account) => account.type === "CHECKING" && !account.parentId && !account.archived) ??
    accountOptions.find((account) => !account.archived);

  return { accounts: accountOptions, categories: categoryOptions, suggestions, defaultAccountId: defaultAccount?.id ?? null };
});
