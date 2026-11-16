import type { Cents } from "@/shared/lib/money";
import { ACCOUNT_GROUPS, type AccountGroup, accountGroupOf } from "./accounts";
import { type Balance, type BalanceAccount, computeOwnBalances, withPockets } from "./balances";
import { addMonths, type YearMonth } from "./period";
import { summarizeMonth } from "./transaction-list";
import type { AccountType, CategoryKind, TransactionStatus, TransactionType } from "./types";

/** Every transaction (those after the displayed month are only used to hide accounts not opened yet). */
export type DashboardTransaction = {
  id: string;
  /** "AAAA-MM-JJ" */
  dateIso: string;
  type: TransactionType;
  status: TransactionStatus;
  amountCents: Cents;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  label: string;
  labelKey: string;
  /** Computed by the app (daily interest): counted everywhere, never "à pointer". */
  computed?: boolean;
};

export type DashboardAccountInput = BalanceAccount & {
  name: string;
  archived: boolean;
  /** "AAAA-MM-JJ": initial balance date (creation date for accounts made in the app). */
  openedOnIso: string;
};

export type DashboardCategoryInput = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string | null;
  parentId: string | null;
};

export type AccountLine = {
  id: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  parentName: string | null;
  group: AccountGroup;
  /** Excel "Début": cleared balance at the end of the previous month. */
  startCents: Cents;
  /** Own balance ("Actuel" = cleared, "Prévisionnel" = start + every transaction of the month). */
  balance: Balance;
  /** Balance including the pockets (top-level accounts). */
  totalBalance: Balance;
};

/** Courant / Épargne / Pockets: each block has its own total (own balances, pockets not added to their parent). */
export type AccountGroupLine = {
  group: AccountGroup;
  startCents: Cents;
  balance: Balance;
  accounts: AccountLine[];
};

export type LabelTotal = { label: string; count: number; cents: Cents };

export type CategoryLine = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  clearedCents: Cents;
  projectedCents: Cents;
  /** Share of the month's (projected) expenses, 0–1. */
  share: number;
  previousCents: Cents;
  /** Average of the 6 previous months having data; null without history. */
  averageCents: Cents | null;
  children: { id: string; name: string; cents: Cents }[];
  topLabels: LabelTotal[];
};

export type MonthPoint = {
  key: string;
  year: number;
  month: number;
  hasData: boolean;
  /** Cleared balances at the end of the month. */
  totalCents: Cents;
  savingsCents: Cents;
  incomeCents: Cents;
  expenseCents: Cents;
  trendCents: Cents;
};

export type Dashboard = {
  month: YearMonth;
  total: Balance;
  /** Top-level savings accounts (pockets excluded). */
  savings: Balance;
  pockets: Balance;
  income: Balance;
  expense: Balance;
  trend: Balance;
  previous: { totalCents: Cents; savingsCents: Cents; pocketsCents: Cents; trendCents: Cents; expenseCents: Cents };
  accounts: AccountLine[];
  groups: AccountGroupLine[];
  expenses: CategoryLine[];
  incomes: LabelTotal[];
  transfers: { fromId: string; toId: string; count: number; cents: Cents }[];
  planned: { count: number; cents: Cents; items: DashboardTransaction[] };
  topMerchants: (LabelTotal & { categoryId: string | null })[];
  history: MonthPoint[];
};

export const monthKey = ({ year, month }: YearMonth): string => `${year}-${String(month).padStart(2, "0")}`;
const monthOf = (dateIso: string) => dateIso.slice(0, 7);
const HISTORY_MONTHS = 12;
const AVERAGE_MONTHS = 6;

function toBalanceInput(transaction: DashboardTransaction) {
  return {
    type: transaction.type,
    status: transaction.status,
    amountCents: transaction.amountCents,
    accountId: transaction.accountId,
    toAccountId: transaction.toAccountId,
  };
}

function sumBalances(
  accounts: readonly DashboardAccountInput[],
  balances: ReadonlyMap<string, Balance>,
  filter: (account: DashboardAccountInput) => boolean = () => true,
): Balance {
  const sum: Balance = { clearedCents: 0, projectedCents: 0 };
  for (const account of accounts) {
    const balance = balances.get(account.id);
    if (!balance || !filter(account)) continue;
    sum.clearedCents += balance.clearedCents;
    sum.projectedCents += balance.projectedCents;
  }
  return sum;
}

function topLabels(transactions: readonly DashboardTransaction[], limit: number): LabelTotal[] {
  const groups = new Map<string, LabelTotal>();
  for (const transaction of transactions) {
    const group = groups.get(transaction.labelKey);
    if (group) {
      group.count++;
      group.cents += transaction.amountCents;
    } else groups.set(transaction.labelKey, { label: transaction.label, count: 1, cents: transaction.amountCents });
  }
  return [...groups.values()].sort((a, b) => b.cents - a.cents).slice(0, limit);
}

/** Everything the "Piloter" page shows for one month, computed from the raw transactions. */
export function buildDashboard(input: {
  month: YearMonth;
  accounts: readonly DashboardAccountInput[];
  categories: readonly DashboardCategoryInput[];
  transactions: readonly DashboardTransaction[];
}): Dashboard {
  const { month, accounts, categories } = input;
  const key = monthKey(month);
  const transactions = input.transactions.filter((transaction) => monthOf(transaction.dateIso) <= key);
  const byMonth = new Map<string, DashboardTransaction[]>();
  for (const transaction of transactions) {
    const group = byMonth.get(monthOf(transaction.dateIso));
    if (group) group.push(transaction);
    else byMonth.set(monthOf(transaction.dateIso), [transaction]);
  }
  const monthTransactions = (ym: YearMonth) => byMonth.get(monthKey(ym)) ?? [];
  const current = monthTransactions(month);
  const firstKey = [...byMonth.keys()].sort()[0] ?? key;

  /** Cleared balances at the end of a month. */
  const clearedAtEndOf = (ym: YearMonth) =>
    computeOwnBalances(
      accounts,
      transactions
        .filter((transaction) => transaction.status === "CLEARED" && monthOf(transaction.dateIso) <= monthKey(ym))
        .map(toBalanceInput),
    );

  // Accounts: start (end of previous month, cleared) + this month's movements.
  const start = clearedAtEndOf(addMonths(month, -1));
  const deltas = computeOwnBalances(
    accounts.map((account) => ({ ...account, initialBalanceCents: 0 })),
    current.map(toBalanceInput),
  );
  const own = new Map<string, Balance>();
  for (const account of accounts) {
    const startCents = start.get(account.id)?.clearedCents ?? 0;
    const delta = deltas.get(account.id) ?? { clearedCents: 0, projectedCents: 0 };
    own.set(account.id, { clearedCents: startCents + delta.clearedCents, projectedCents: startCents + delta.projectedCents });
  }
  const totals = withPockets(accounts, own);
  const movedThisMonth = new Set(current.flatMap((transaction) => [transaction.accountId, transaction.toAccountId ?? ""]));
  const usedLater = new Set(
    input.transactions
      .filter((transaction) => monthOf(transaction.dateIso) > key)
      .flatMap((transaction) => [transaction.accountId, transaction.toAccountId ?? ""]),
  );
  const usedSoFar = new Set(transactions.flatMap((transaction) => [transaction.accountId, transaction.toAccountId ?? ""]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const accountLines: AccountLine[] = accounts
    .filter((account) => {
      const balance = own.get(account.id) ?? { clearedCents: 0, projectedCents: 0 };
      const empty = balance.clearedCents === 0 && balance.projectedCents === 0 && !movedThisMonth.has(account.id);
      if (!empty) return true;
      // Empty: hide closed accounts and accounts that only start being used (or exist) after this month.
      if (account.archived || account.openedOnIso.slice(0, 7) > key) return false;
      return !(usedLater.has(account.id) && !usedSoFar.has(account.id));
    })
    .map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      parentId: account.parentId,
      parentName: account.parentId ? (accountById.get(account.parentId)?.name ?? null) : null,
      group: accountGroupOf(account),
      startCents: start.get(account.id)?.clearedCents ?? 0,
      balance: own.get(account.id) ?? { clearedCents: 0, projectedCents: 0 },
      totalBalance: totals.get(account.id) ?? { clearedCents: 0, projectedCents: 0 },
    }));

  const summary = summarizeMonth(current);
  const previousMonth = addMonths(month, -1);
  const previousSummary = summarizeMonth(monthTransactions(previousMonth));

  // Expenses by top-level category.
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const topIdOf = (categoryId: string | null) => {
    const category = categoryId ? categoryById.get(categoryId) : undefined;
    return category?.parentId ?? category?.id ?? "unknown";
  };
  const expensesOf = (list: readonly DashboardTransaction[]) => list.filter((transaction) => transaction.type === "EXPENSE");
  const totalByTop = (list: readonly DashboardTransaction[]) => {
    const totalsByTop = new Map<string, Cents>();
    for (const transaction of expensesOf(list)) {
      const topId = topIdOf(transaction.categoryId);
      totalsByTop.set(topId, (totalsByTop.get(topId) ?? 0) + transaction.amountCents);
    }
    return totalsByTop;
  };
  const previousTotals = totalByTop(monthTransactions(previousMonth));
  const averageMonths = Array.from({ length: AVERAGE_MONTHS }, (_, index) => addMonths(month, -(index + 1))).filter(
    (ym) => monthKey(ym) >= firstKey,
  );
  const averageTotals = averageMonths.map((ym) => totalByTop(monthTransactions(ym)));

  const currentExpenses = expensesOf(current);
  const expenseLines: CategoryLine[] = [];
  for (const topId of new Set(currentExpenses.map((transaction) => topIdOf(transaction.categoryId)))) {
    const items = currentExpenses.filter((transaction) => topIdOf(transaction.categoryId) === topId);
    const category = categoryById.get(topId);
    const projectedCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    const childTotals = new Map<string, Cents>();
    for (const item of items) {
      if (item.categoryId && item.categoryId !== topId) {
        childTotals.set(item.categoryId, (childTotals.get(item.categoryId) ?? 0) + item.amountCents);
      }
    }
    expenseLines.push({
      id: topId,
      name: category?.name ?? "Sans catégorie",
      color: category?.color ?? "#64748b",
      icon: category?.icon ?? null,
      clearedCents: items.filter((item) => item.status === "CLEARED").reduce((sum, item) => sum + item.amountCents, 0),
      projectedCents,
      share: summary.expense.projectedCents > 0 ? projectedCents / summary.expense.projectedCents : 0,
      previousCents: previousTotals.get(topId) ?? 0,
      averageCents:
        averageTotals.length > 0
          ? Math.round(averageTotals.reduce((sum, totalsOfMonth) => sum + (totalsOfMonth.get(topId) ?? 0), 0) / averageTotals.length)
          : null,
      children: [...childTotals.entries()]
        .map(([id, cents]) => ({ id, name: categoryById.get(id)?.name ?? "?", cents }))
        .sort((a, b) => b.cents - a.cents),
      topLabels: topLabels(items, 3),
    });
  }
  expenseLines.sort((a, b) => b.projectedCents - a.projectedCents);

  const transfers = new Map<string, { fromId: string; toId: string; count: number; cents: Cents }>();
  for (const transaction of current) {
    if (transaction.type !== "TRANSFER" || !transaction.toAccountId) continue;
    const transferKey = `${transaction.accountId}>${transaction.toAccountId}`;
    const group = transfers.get(transferKey);
    if (group) {
      group.count++;
      group.cents += transaction.amountCents;
    } else transfers.set(transferKey, { fromId: transaction.accountId, toId: transaction.toAccountId, count: 1, cents: transaction.amountCents });
  }

  const planned = current.filter((transaction) => transaction.status === "PLANNED" && !transaction.computed);
  const inGroup = (group: AccountGroup) => (account: DashboardAccountInput) => accountGroupOf(account) === group;
  const savingsFilter = inGroup("SAVINGS");
  const groups: AccountGroupLine[] = ACCOUNT_GROUPS.map((group) => ({
    group,
    startCents: sumBalances(accounts, start, inGroup(group)).clearedCents,
    balance: sumBalances(accounts, own, inGroup(group)),
    accounts: accountLines.filter((line) => line.group === group),
  })).filter((line) => line.accounts.length > 0);

  const history: MonthPoint[] = Array.from({ length: HISTORY_MONTHS }, (_, index) => {
    const ym = addMonths(month, index - (HISTORY_MONTHS - 1));
    const balances = clearedAtEndOf(ym);
    const flows = summarizeMonth(monthTransactions(ym));
    return {
      key: monthKey(ym),
      year: ym.year,
      month: ym.month,
      hasData: monthKey(ym) >= firstKey,
      totalCents: sumBalances(accounts, balances).clearedCents,
      savingsCents: sumBalances(accounts, balances, savingsFilter).clearedCents,
      incomeCents: flows.income.projectedCents,
      expenseCents: flows.expense.projectedCents,
      trendCents: flows.trend.projectedCents,
    };
  });

  return {
    month,
    total: sumBalances(accounts, own),
    savings: sumBalances(accounts, own, savingsFilter),
    pockets: sumBalances(accounts, own, inGroup("POCKETS")),
    income: summary.income,
    expense: summary.expense,
    trend: summary.trend,
    previous: {
      totalCents: sumBalances(accounts, start).clearedCents,
      savingsCents: sumBalances(accounts, start, savingsFilter).clearedCents,
      pocketsCents: sumBalances(accounts, start, inGroup("POCKETS")).clearedCents,
      trendCents: previousSummary.trend.projectedCents,
      expenseCents: previousSummary.expense.projectedCents,
    },
    accounts: accountLines,
    groups,
    expenses: expenseLines,
    incomes: topLabels(current.filter((transaction) => transaction.type === "INCOME"), 5),
    transfers: [...transfers.values()].sort((a, b) => b.cents - a.cents),
    planned: {
      count: planned.length,
      cents: planned.reduce((sum, transaction) => sum + signedForPlanned(transaction), 0),
      items: planned.slice(0, 5),
    },
    topMerchants: topLabelsWithCategory(currentExpenses, 5),
    history,
  };
}

/** Planned total as an impact on the balance (incomes +, expenses −, transfers 0). */
function signedForPlanned(transaction: DashboardTransaction): Cents {
  if (transaction.type === "INCOME") return transaction.amountCents;
  if (transaction.type === "EXPENSE") return -transaction.amountCents;
  return 0;
}

function topLabelsWithCategory(transactions: readonly DashboardTransaction[], limit: number) {
  const groups = new Map<string, LabelTotal & { categoryId: string | null }>();
  for (const transaction of transactions) {
    const group = groups.get(transaction.labelKey);
    if (group) {
      group.count++;
      group.cents += transaction.amountCents;
    } else {
      groups.set(transaction.labelKey, {
        label: transaction.label,
        count: 1,
        cents: transaction.amountCents,
        categoryId: transaction.categoryId,
      });
    }
  }
  return [...groups.values()].sort((a, b) => b.cents - a.cents).slice(0, limit);
}
