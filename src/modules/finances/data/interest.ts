import { cache } from "react";
import { requireSession } from "@/shared/auth/server";
import { db } from "@/shared/lib/db";
import { todayIso } from "@/shared/lib/today";
import { buildInterestTransactions, type InterestRateInput, type InterestTransaction } from "../domain/interest";
import { dateForUnknownDay, yearMonthOf } from "../domain/period";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Rates of every account, by account (date order). */
export async function getInterestRates(): Promise<Map<string, { id: string; validFromIso: string; rateBp: number }[]>> {
  const { userId } = await requireSession();
  const rates = await db.interestRate.findMany({ where: { account: { userId } }, orderBy: [{ accountId: "asc" }, { validFrom: "asc" }] });
  const byAccount = new Map<string, { id: string; validFromIso: string; rateBp: number }[]>();
  for (const rate of rates) {
    const list = byAccount.get(rate.accountId) ?? [];
    list.push({ id: rate.id, validFromIso: isoDate(rate.validFrom), rateBp: rate.rateBp });
    byAccount.set(rate.accountId, list);
  }
  return byAccount;
}

/**
 * Computed interest transactions of every account having rates, up to the end of the current month
 * (or of the last month having transactions). Empty and cheap when no rate exists.
 */
export const getInterestTransactions = cache(async (): Promise<InterestTransaction[]> => {
  const ratesByAccount: Map<string, InterestRateInput[]> = await getInterestRates();
  if (ratesByAccount.size === 0) return [];
  const accountIds = [...ratesByAccount.keys()];
  const { userId } = await requireSession();

  const [accounts, transactions, last] = await Promise.all([
    db.account.findMany({ where: { userId, id: { in: accountIds } }, select: { id: true, initialBalanceCents: true } }),
    db.transaction.findMany({
      where: { userId, OR: [{ accountId: { in: accountIds } }, { toAccountId: { in: accountIds } }] },
      select: { date: true, type: true, status: true, amountCents: true, accountId: true, toAccountId: true },
    }),
    db.transaction.aggregate({ where: { userId }, _max: { date: true } }),
  ]);

  const today = todayIso();
  const endOfCurrentMonth = isoDate(dateForUnknownDay(yearMonthOf(new Date(`${today}T00:00:00Z`))));
  const lastDate = last._max.date;
  const endOfLastMonth = lastDate ? isoDate(dateForUnknownDay(yearMonthOf(lastDate))) : endOfCurrentMonth;

  return buildInterestTransactions({
    accounts,
    transactions: transactions.map(({ date, ...transaction }) => ({ ...transaction, dateIso: isoDate(date) })),
    ratesByAccount,
    todayIso: today,
    untilIso: endOfLastMonth > endOfCurrentMonth ? endOfLastMonth : endOfCurrentMonth,
  });
});

export async function findAccountForRates(accountId: string) {
  const { userId } = await requireSession();
  return db.account.findUnique({ where: { id: accountId, userId }, select: { id: true, type: true, parentId: true } });
}

/** One rate per account and date: adding a rate on an existing date replaces it. */
export async function upsertInterestRate(accountId: string, validFrom: Date, rateBp: number): Promise<void> {
  await db.interestRate.upsert({
    where: { accountId_validFrom: { accountId, validFrom } },
    create: { accountId, validFrom, rateBp },
    update: { rateBp },
  });
}

export async function deleteInterestRate(id: string): Promise<boolean> {
  const { userId } = await requireSession();
  const { count } = await db.interestRate.deleteMany({ where: { id, account: { userId } } });
  return count > 0;
}
