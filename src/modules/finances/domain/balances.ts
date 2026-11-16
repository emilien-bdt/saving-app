import type { Cents } from "@/shared/lib/money";
import type { AccountType, TransactionStatus, TransactionType } from "./types";

export type BalanceAccount = {
  id: string;
  type: AccountType;
  parentId: string | null;
  initialBalanceCents: Cents;
};

export type BalanceTransaction = {
  type: TransactionType;
  status: TransactionStatus;
  amountCents: Cents;
  accountId: string;
  toAccountId: string | null;
};

/** "Actuel" = cleared transactions only (Excel ü) ; "Prévisionnel" = all of them. */
export type Balance = { clearedCents: Cents; projectedCents: Cents };

const zero = (): Balance => ({ clearedCents: 0, projectedCents: 0 });

function add(balance: Balance, delta: Cents, cleared: boolean): void {
  balance.projectedCents += delta;
  if (cleared) balance.clearedCents += delta;
}

/**
 * Balance of each account on its own (pockets not included).
 * The caller passes the transactions of the period to consider.
 */
export function computeOwnBalances(
  accounts: readonly BalanceAccount[],
  transactions: readonly BalanceTransaction[],
): Map<string, Balance> {
  const balances = new Map<string, Balance>();
  for (const account of accounts) {
    balances.set(account.id, {
      clearedCents: account.initialBalanceCents,
      projectedCents: account.initialBalanceCents,
    });
  }

  const balanceOf = (accountId: string): Balance => {
    const balance = balances.get(accountId);
    if (!balance) throw new Error(`Transaction on unknown account ${accountId}`);
    return balance;
  };

  for (const transaction of transactions) {
    const cleared = transaction.status === "CLEARED";
    const amount = transaction.amountCents;
    switch (transaction.type) {
      case "INCOME":
        add(balanceOf(transaction.accountId), amount, cleared);
        break;
      case "EXPENSE":
        add(balanceOf(transaction.accountId), -amount, cleared);
        break;
      case "TRANSFER":
        if (!transaction.toAccountId) throw new Error("Transfer without destination account");
        add(balanceOf(transaction.accountId), -amount, cleared);
        add(balanceOf(transaction.toAccountId), amount, cleared);
        break;
    }
  }
  return balances;
}

/** Balance displayed for each account: its own balance plus its pockets' (one level). */
export function withPockets(
  accounts: readonly BalanceAccount[],
  ownBalances: ReadonlyMap<string, Balance>,
): Map<string, Balance> {
  const totals = new Map<string, Balance>();
  for (const account of accounts) {
    const own = ownBalances.get(account.id) ?? zero();
    totals.set(account.id, { ...own });
  }
  for (const account of accounts) {
    if (!account.parentId) continue;
    const parent = totals.get(account.parentId);
    const own = ownBalances.get(account.id);
    if (!parent || !own) continue;
    parent.clearedCents += own.clearedCents;
    parent.projectedCents += own.projectedCents;
  }
  return totals;
}

/** Overall total and savings total (Excel "Total" and "Épargne"); a pocket counts with its own type. */
export function summarizeBalances(
  accounts: readonly BalanceAccount[],
  ownBalances: ReadonlyMap<string, Balance>,
): { total: Balance; savings: Balance } {
  const total = zero();
  const savings = zero();
  for (const account of accounts) {
    const own = ownBalances.get(account.id);
    if (!own) continue;
    total.clearedCents += own.clearedCents;
    total.projectedCents += own.projectedCents;
    if (account.type === "SAVINGS") {
      savings.clearedCents += own.clearedCents;
      savings.projectedCents += own.projectedCents;
    }
  }
  return { total, savings };
}

/** Excel "Tendance": incomes − expenses of a period (transfers are neutral). */
export function computeTrend(transactions: readonly BalanceTransaction[]): Balance {
  const trend = zero();
  for (const transaction of transactions) {
    if (transaction.type === "TRANSFER") continue;
    const delta = transaction.type === "INCOME" ? transaction.amountCents : -transaction.amountCents;
    add(trend, delta, transaction.status === "CLEARED");
  }
  return trend;
}
