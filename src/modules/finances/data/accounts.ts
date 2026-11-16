import { db } from "@/shared/lib/db";
import { todayIso } from "@/shared/lib/today";
import { type AccountState, accountGroupOf, canDeleteAccount, nextSortOrder } from "../domain/accounts";
import type { AccountData } from "../schemas/account";
import type { AccountSettingsItem } from "../view-models";

/** Every account with what the rules need (usage counts). */
export async function getAccountStates(): Promise<(AccountState & { color: string; icon: string | null })[]> {
  const accounts = await db.account.findMany({
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
  const accounts = await getAccountStates();
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
  }));
}

/** A new account starts at 0 € today; its balance then only moves through transactions. */
export async function createAccount(data: AccountData, accounts: readonly AccountState[]): Promise<void> {
  await db.account.create({
    data: {
      ...data,
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
  await db.account.update({
    where: { id },
    data: { ...data, ...(moved ? { sortOrder: nextSortOrder(data, accounts) } : {}) },
  });
}

export async function setAccountArchived(id: string, archived: boolean): Promise<void> {
  await db.account.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
}

export async function deleteAccount(id: string): Promise<void> {
  await db.account.delete({ where: { id } });
}

export async function setSortOrders(updates: readonly { id: string; sortOrder: number }[]): Promise<void> {
  await db.$transaction(updates.map(({ id, sortOrder }) => db.account.update({ where: { id }, data: { sortOrder } })));
}
