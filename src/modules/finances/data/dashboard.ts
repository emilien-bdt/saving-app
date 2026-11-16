import { db } from "@/shared/lib/db";
import { buildDashboard, type Dashboard } from "../domain/dashboard";
import type { YearMonth } from "../domain/period";

export type DashboardData = {
  dashboard: Dashboard;
  accountNames: Record<string, string>;
};

/** Loads the whole history (a few thousand rows at most) and computes the month's dashboard. */
export async function getDashboard(month: YearMonth): Promise<DashboardData> {
  const [accounts, categories, transactions] = await Promise.all([
    db.account.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.category.findMany({ select: { id: true, name: true, kind: true, color: true, icon: true, parentId: true } }),
    db.transaction.findMany({
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        type: true,
        status: true,
        amountCents: true,
        accountId: true,
        toAccountId: true,
        categoryId: true,
        label: true,
        labelKey: true,
      },
    }),
  ]);

  const dashboard = buildDashboard({
    month,
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      parentId: account.parentId,
      initialBalanceCents: account.initialBalanceCents,
      archived: account.archivedAt !== null,
    })),
    categories,
    transactions: transactions.map(({ date, ...transaction }) => ({ ...transaction, dateIso: date.toISOString().slice(0, 10) })),
  });
  return { dashboard, accountNames: Object.fromEntries(accounts.map((account) => [account.id, account.name])) };
}
