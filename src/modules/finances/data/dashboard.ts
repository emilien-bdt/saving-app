import { requireSession } from "@/shared/auth/server";
import { db } from "@/shared/lib/db";
import { buildDashboard, type Dashboard } from "../domain/dashboard";
import type { YearMonth } from "../domain/period";
import { getInterestTransactions } from "./interest";

export type DashboardData = {
  dashboard: Dashboard;
  accountNames: Record<string, string>;
};

/** Loads the whole history (a few thousand rows at most) and computes the month's dashboard. */
export async function getDashboard(month: YearMonth): Promise<DashboardData> {
  const { userId } = await requireSession();
  const [accounts, categories, transactions, interest] = await Promise.all([
    db.account.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.category.findMany({ where: { userId }, select: { id: true, name: true, kind: true, color: true, icon: true, parentId: true } }),
    db.transaction.findMany({
      where: { userId },
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
    getInterestTransactions(),
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
      openedOnIso: account.initialBalanceDate.toISOString().slice(0, 10),
    })),
    categories,
    transactions: [
      ...transactions.map(({ date, ...transaction }) => ({ ...transaction, dateIso: date.toISOString().slice(0, 10) })),
      ...interest,
    ],
  });
  return { dashboard, accountNames: Object.fromEntries(accounts.map((account) => [account.id, account.name])) };
}
