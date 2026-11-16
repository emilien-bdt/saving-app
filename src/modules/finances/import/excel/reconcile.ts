import type { Cents } from "@/shared/lib/money";
import { type BalanceAccount, computeOwnBalances } from "../../domain/balances";
import { monthRange, type YearMonth } from "../../domain/period";
import { type AccountKey, IMPORT_ACCOUNTS } from "./mapping";
import type { ImportPlan } from "./types";

export type CheckResult = {
  yearMonth: YearMonth;
  cell: string;
  accounts: AccountKey[];
  excelCents: Cents;
  computedCents: Cents;
  diffCents: Cents;
};

/**
 * Recomputes, at the end of each month, the "Actuel" (cleared) balance of
 * the accounts and compares it with the Excel cells (C7, C17, …).
 */
export function reconcile(plan: ImportPlan): CheckResult[] {
  const accounts: BalanceAccount[] = plan.accounts.map((key) => ({
    id: key,
    type: IMPORT_ACCOUNTS[key].type,
    parentId: null,
    initialBalanceCents: plan.initialBalances[key],
  }));
  const sorted = [...plan.transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const results: CheckResult[] = [];

  let cursor = 0;
  const upToNow: typeof sorted = [];
  for (const month of plan.months) {
    const { end } = monthRange(month.yearMonth);
    while (cursor < sorted.length && (sorted[cursor]?.date.getTime() ?? Infinity) < end.getTime()) {
      const transaction = sorted[cursor];
      if (transaction) upToNow.push(transaction);
      cursor++;
    }
    const balances = computeOwnBalances(
      accounts,
      upToNow.map((transaction) => ({
        type: transaction.type,
        status: transaction.status,
        amountCents: transaction.amountCents,
        accountId: transaction.accountKey,
        toAccountId: transaction.toAccountKey,
      })),
    );
    for (const check of month.balanceChecks) {
      const computedCents = check.accounts.reduce((sum, key) => sum + (balances.get(key)?.clearedCents ?? 0), 0);
      results.push({
        yearMonth: month.yearMonth,
        cell: check.cell,
        accounts: check.accounts,
        excelCents: check.excelCents,
        computedCents,
        diffCents: computedCents - check.excelCents,
      });
    }
  }
  return results;
}

