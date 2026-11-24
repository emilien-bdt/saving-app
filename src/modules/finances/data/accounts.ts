import { requireSession } from "@/shared/auth/server";
import { db } from "@/shared/lib/db";
import { todayIso } from "@/shared/lib/today";
import { type AccountState, accountGroupOf, canDeleteAccount, nextSortOrder } from "../domain/accounts";
import { rateOn } from "../domain/interest";
import type { AccountData } from "../schemas/account";
import type { AccountSettingsItem } from "../view-models";
import { getInterestRates } from "./interest";

/** Every account with what the rules need (usage counts). */
export async function getAccountStates(): Promise<(AccountState & { color: string; icon: string | null })[]> {
  const { userId } = await requireSession();
  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { transactions: true, incomingTransfers: true, recurringRules: true, incomingRecurringRules: true } },
    },
  });
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    parentId: account.parentId,
    archived: account.archivedAt !== null,
    sortOrder: account.sortOrder,
    color: account.color,
    icon: account.icon,
    usageCount:
      account._count.transactions +
      account._count.incomingTransfers +
      account._count.recurringRules +
      account._count.incomingRecurringRules,
  }));
}

export async function getAccountsForSettings(): Promise<AccountSettingsItem[]> {
  const [accounts, rates] = await Promise.all([getAccountStates(), getInterestRates()]);
  const today = todayIso();
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    parentId: account.parentId,
    parentName: account.parentId ? (names.get(account.parentId) ?? null) : null,
    color: account.color,
    icon: account.icon,
    archived: account.archived,
    group: accountGroupOf(account),
    usageCount: account.usageCount,
    canDelete: canDeleteAccount(account.id, accounts),
    interestRates: rates.get(account.id) ?? [],
    currentRateBp: rateOn(today, rates.get(account.id) ?? []),
  }));
}

/** A new account starts at 0 € today; its balance then only moves through transactions. */
export async function createAccount(data: AccountData, accounts: readonly AccountState[]): Promise<void> {
  const { userId } = await requireSession();
  await db.account.create({
    data: {
      ...data,
      userId,
      sortOrder: nextSortOrder(data, accounts),
      initialBalanceCents: 0,
      initialBalanceDate: new Date(`${todayIso()}T00:00:00Z`),
    },
  });
}

/** The initial balance is never changed here. */
export async function updateAccount(id: string, data: AccountData, accounts: readonly AccountState[]): Promise<void> {
  const existing = accounts.find((account) => account.id === id);
  const moved = existing && (existing.parentId !== data.parentId || (!data.parentId && existing.type !== data.type));
  const { userId } = await requireSession();
  await db.account.update({
    where: { id, userId },
    data: { ...data, ...(moved ? { sortOrder: nextSortOrder(data, accounts) } : {}) },
  });
}

export async function setAccountArchived(id: string, archived: boolean): Promise<void> {
  const { userId } = await requireSession();
  await db.account.update({ where: { id, userId }, data: { archivedAt: archived ? new Date() : null } });
}

export async function deleteAccount(id: string): Promise<void> {
  const { userId } = await requireSession();
  await db.account.delete({ where: { id, userId } });
}

export async function setSortOrders(updates: readonly { id: string; sortOrder: number }[]): Promise<void> {
  const { userId } = await requireSession();
  await db.$transaction(updates.map(({ id, sortOrder }) => db.account.update({ where: { id, userId }, data: { sortOrder } })));
}
