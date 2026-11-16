import type { Cents } from "@/shared/lib/money";
import type { Balance } from "./balances";
import type { TransactionStatus, TransactionType } from "./types";

/** Minimal shape needed to group / summarize a list of transactions. */
export type ListTransaction = {
  id: string;
  /** "AAAA-MM-JJ" */
  dateIso: string;
  dayUnknown: boolean;
  amountCents: Cents;
  type: TransactionType;
  status: TransactionStatus;
  label: string;
  labelKey: string;
  categoryId: string | null;
};

/** + for an income, − for an expense, 0 for a transfer (neutral for the month). */
export function signedAmountCents(transaction: Pick<ListTransaction, "type" | "amountCents">): Cents {
  if (transaction.type === "INCOME") return transaction.amountCents;
  if (transaction.type === "EXPENSE") return -transaction.amountCents;
  return 0;
}

export type DayGroup<T extends ListTransaction> = {
  key: string;
  /** null for the "Plusieurs jours" group (days unknown). */
  dateIso: string | null;
  items: T[];
  netCents: Cents;
};

/** Most recent day first; rows without a day ("Plusieurs jours") at the end. */
export function groupByDay<T extends ListTransaction>(items: readonly T[]): DayGroup<T>[] {
  const days = new Map<string, T[]>();
  const unknown: T[] = [];
  for (const item of items) {
    if (item.dayUnknown) unknown.push(item);
    else days.set(item.dateIso, [...(days.get(item.dateIso) ?? []), item]);
  }
  const net = (group: readonly T[]) => group.reduce((sum, item) => sum + signedAmountCents(item), 0);
  const groups: DayGroup<T>[] = [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateIso, group]) => ({ key: dateIso, dateIso, items: group, netCents: net(group) }));
  if (unknown.length > 0) groups.push({ key: "unknown", dateIso: null, items: unknown, netCents: net(unknown) });
  return groups;
}

export type LabelGroup<T extends ListTransaction> = {
  key: string;
  label: string;
  type: TransactionType;
  categoryId: string | null;
  items: T[];
  totalCents: Cents;
  plannedCount: number;
};

/** Repeated purchases together (same normalized label, type and category), biggest total first. */
export function groupByLabel<T extends ListTransaction>(items: readonly T[]): LabelGroup<T>[] {
  const groups = new Map<string, LabelGroup<T>>();
  for (const item of items) {
    const key = `${item.type}|${item.categoryId ?? ""}|${item.labelKey}`;
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
      group.totalCents += item.amountCents;
      if (item.status === "PLANNED") group.plannedCount++;
    } else {
      groups.set(key, {
        key,
        label: item.label,
        type: item.type,
        categoryId: item.categoryId,
        items: [item],
        totalCents: item.amountCents,
        plannedCount: item.status === "PLANNED" ? 1 : 0,
      });
    }
  }
  return [...groups.values()].sort((a, b) => b.totalCents - a.totalCents || a.label.localeCompare(b.label, "fr"));
}

export type MonthSummary = { income: Balance; expense: Balance; trend: Balance };

/** Incomes, expenses and "Tendance" (incomes − expenses) — cleared and projected. */
export function summarizeMonth(items: readonly Pick<ListTransaction, "type" | "status" | "amountCents">[]): MonthSummary {
  const income: Balance = { clearedCents: 0, projectedCents: 0 };
  const expense: Balance = { clearedCents: 0, projectedCents: 0 };
  for (const item of items) {
    const target = item.type === "INCOME" ? income : item.type === "EXPENSE" ? expense : null;
    if (!target) continue;
    target.projectedCents += item.amountCents;
    if (item.status === "CLEARED") target.clearedCents += item.amountCents;
  }
  return {
    income,
    expense,
    trend: {
      clearedCents: income.clearedCents - expense.clearedCents,
      projectedCents: income.projectedCents - expense.projectedCents,
    },
  };
}
