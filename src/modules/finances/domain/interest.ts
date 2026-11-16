import type { Cents } from "@/shared/lib/money";
import { addDaysIso } from "@/shared/lib/today";
import type { BalanceTransaction } from "./balances";

/**
 * Daily interest (Revolut-like instant-access savings), never stored:
 * recomputed from the balances, so changing a rate or a past transaction updates every figure.
 *
 * - Interest of day D = end-of-day balance × annual rate / 365, rounded to the cent,
 *   and added to the balance from day D+1 (interest earns interest).
 * - No interest on a balance ≤ 0, before the first rate, or with a 0 % rate.
 * - "Actuel": cleared transactions only, interest of days up to yesterday.
 * - "Prévisionnel" of a month: like the dashboard, starts from the cleared balance at the end of the
 *   previous month, then every transaction of the month (planned too) and interest for every day of the month.
 */

export const DAYS_PER_YEAR = 365;
export const INTEREST_LABEL = "Intérêts";
export const INTEREST_LABEL_KEY = "interets";

export type InterestRateInput = { validFromIso: string; rateBp: number };
export type InterestMovement = { dateIso: string; deltaCents: Cents; cleared: boolean };
export type MonthInterest = { monthKey: string; clearedCents: Cents; projectedCents: Cents };

export function dailyInterestCents(balanceCents: Cents, rateBp: number): Cents {
  if (balanceCents <= 0 || rateBp <= 0) return 0;
  return Math.round((balanceCents * rateBp) / (10_000 * DAYS_PER_YEAR));
}

const monthOf = (dateIso: string) => dateIso.slice(0, 7);
const firstDayOf = (monthKey: string) => `${monthKey}-01`;

function shiftMonthKey(monthKey: string, delta: -1 | 1): string {
  const [year = 1970, month = 1] = monthKey.split("-").map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}
const previousMonthKey = (monthKey: string) => shiftMonthKey(monthKey, -1);
const nextMonthKey = (monthKey: string) => shiftMonthKey(monthKey, 1);

/** Rate (bp) applying on a day; rates sorted by date (0 before the first one). */
export function rateOn(dateIso: string, rates: readonly InterestRateInput[]): number {
  let rate = 0;
  for (const candidate of rates) {
    if (candidate.validFromIso > dateIso) break;
    rate = candidate.rateBp;
  }
  return rate;
}

/** Interest of one account, month by month, from the month of its first rate to the month of `untilIso`. */
export function computeAccountInterest(input: {
  initialBalanceCents: Cents;
  movements: readonly InterestMovement[];
  rates: readonly InterestRateInput[];
  todayIso: string;
  untilIso: string;
}): MonthInterest[] {
  const rates = [...input.rates].sort((a, b) => a.validFromIso.localeCompare(b.validFromIso));
  const firstRate = rates[0];
  if (!firstRate || firstRate.validFromIso > input.untilIso) return [];
  const startIso = firstRate.validFromIso;
  const firstDay = firstDayOf(monthOf(startIso));

  const clearedDelta = new Map<string, Cents>();
  const allDelta = new Map<string, Cents>();
  let balanceBefore = input.initialBalanceCents;
  for (const movement of input.movements) {
    if (movement.dateIso < firstDay) {
      if (movement.cleared) balanceBefore += movement.deltaCents;
      continue;
    }
    allDelta.set(movement.dateIso, (allDelta.get(movement.dateIso) ?? 0) + movement.deltaCents);
    if (movement.cleared) clearedDelta.set(movement.dateIso, (clearedDelta.get(movement.dateIso) ?? 0) + movement.deltaCents);
  }

  // Cleared path: real balance, interest of days before today.
  const clearedInterest = new Map<string, Cents>();
  const clearedEnd = new Map<string, Cents>();
  let balance = balanceBefore;
  for (let day = firstDay; day <= input.untilIso; day = addDaysIso(day, 1)) {
    balance += clearedDelta.get(day) ?? 0;
    if (day >= startIso && day < input.todayIso) {
      const interest = dailyInterestCents(balance, rateOn(day, rates));
      balance += interest;
      clearedInterest.set(monthOf(day), (clearedInterest.get(monthOf(day)) ?? 0) + interest);
    }
    clearedEnd.set(monthOf(day), balance);
  }

  // Projected path, month by month (same definition as the dashboard's "Prévisionnel").
  const result: MonthInterest[] = [];
  for (let monthKey = monthOf(firstDay); monthKey <= monthOf(input.untilIso); monthKey = nextMonthKey(monthKey)) {
    let projectedBalance = clearedEnd.get(previousMonthKey(monthKey)) ?? balanceBefore;
    let projected = 0;
    for (let day = firstDayOf(monthKey); monthOf(day) === monthKey && day <= input.untilIso; day = addDaysIso(day, 1)) {
      projectedBalance += allDelta.get(day) ?? 0;
      if (day >= startIso) {
        const interest = dailyInterestCents(projectedBalance, rateOn(day, rates));
        projectedBalance += interest;
        projected += interest;
      }
    }
    const cleared = clearedInterest.get(monthKey) ?? 0;
    // A planned expense dated in the past could make the projection lower: never below what is earned.
    if (cleared > 0 || projected > 0) result.push({ monthKey, clearedCents: cleared, projectedCents: Math.max(projected, cleared) });
  }
  return result;
}

/** Movements of one account (own balance) from its transactions. */
export function movementsOf(accountId: string, transactions: readonly (BalanceTransaction & { dateIso: string })[]): InterestMovement[] {
  const movements: InterestMovement[] = [];
  for (const transaction of transactions) {
    const cleared = transaction.status === "CLEARED";
    if (transaction.accountId === accountId) {
      const sign = transaction.type === "INCOME" ? 1 : -1;
      movements.push({ dateIso: transaction.dateIso, deltaCents: sign * transaction.amountCents, cleared });
    }
    if (transaction.type === "TRANSFER" && transaction.toAccountId === accountId) {
      movements.push({ dateIso: transaction.dateIso, deltaCents: transaction.amountCents, cleared });
    }
  }
  return movements;
}

/** Computed (read-only) transaction carrying a month's interest: shown in the Journal and counted in every balance. */
export type InterestTransaction = {
  id: string;
  dateIso: string;
  dayUnknown: true;
  type: "INCOME";
  status: "CLEARED" | "PLANNED";
  amountCents: Cents;
  accountId: string;
  toAccountId: null;
  categoryId: null;
  label: string;
  labelKey: string;
  note: null;
  computed: true;
};

function lastDayOfMonthIso(monthKey: string): string {
  return addDaysIso(firstDayOf(nextMonthKey(monthKey)), -1);
}

/**
 * One cleared transaction per month (interest earned up to yesterday) and one planned
 * transaction for the rest of the month's projection, for every account having rates.
 */
export function buildInterestTransactions(input: {
  accounts: readonly { id: string; initialBalanceCents: Cents }[];
  transactions: readonly (BalanceTransaction & { dateIso: string })[];
  ratesByAccount: ReadonlyMap<string, readonly InterestRateInput[]>;
  todayIso: string;
  untilIso: string;
}): InterestTransaction[] {
  const result: InterestTransaction[] = [];
  for (const account of input.accounts) {
    const rates = input.ratesByAccount.get(account.id);
    if (!rates || rates.length === 0) continue;
    const months = computeAccountInterest({
      initialBalanceCents: account.initialBalanceCents,
      movements: movementsOf(account.id, input.transactions),
      rates,
      todayIso: input.todayIso,
      untilIso: input.untilIso,
    });
    for (const month of months) {
      const base = {
        dateIso: lastDayOfMonthIso(month.monthKey),
        dayUnknown: true as const,
        type: "INCOME" as const,
        accountId: account.id,
        toAccountId: null,
        categoryId: null,
        label: INTEREST_LABEL,
        labelKey: INTEREST_LABEL_KEY,
        note: null,
        computed: true as const,
      };
      if (month.clearedCents > 0) {
        result.push({ ...base, id: `interest:${account.id}:${month.monthKey}:cleared`, status: "CLEARED", amountCents: month.clearedCents });
      }
      const rest = month.projectedCents - month.clearedCents;
      if (rest > 0) result.push({ ...base, id: `interest:${account.id}:${month.monthKey}:planned`, status: "PLANNED", amountCents: rest });
    }
  }
  return result;
}
