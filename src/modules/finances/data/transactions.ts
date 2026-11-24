import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/shared/auth/server";
import { db } from "@/shared/lib/db";
import type { TransactionFilters } from "../domain/list-filters";
import { monthRange, type YearMonth } from "../domain/period";
import type { ReferencedAccount, ReferencedCategory } from "../domain/reference-check";
import type { TransactionStatus } from "../domain/types";
import type { TransactionData } from "../schemas/transaction";
import type { TransactionItem } from "../view-models";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export async function listMonthTransactions(month: YearMonth, filters: TransactionFilters): Promise<TransactionItem[]> {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);
  const conditions: Prisma.TransactionWhereInput[] = [{ userId }, { date: { gte: start, lt: end } }];
  if (filters.accountId) {
    conditions.push({ OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] });
  }
  if (filters.categoryId) {
    conditions.push({ OR: [{ categoryId: filters.categoryId }, { category: { parentId: filters.categoryId } }] });
  }
  if (filters.status) conditions.push({ status: filters.status });
  if (filters.query) {
    conditions.push({
      OR: [
        { label: { contains: filters.query, mode: "insensitive" } },
        { note: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  const rows = await db.transaction.findMany({
    where: { AND: conditions },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      date: true,
      dayUnknown: true,
      amountCents: true,
      type: true,
      status: true,
      label: true,
      labelKey: true,
      note: true,
      accountId: true,
      toAccountId: true,
      categoryId: true,
    },
  });
  return rows.map(({ date, ...row }) => ({ ...row, dateIso: isoDate(date) }));
}

export async function findReferences(data: {
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
}): Promise<{ account: ReferencedAccount | null; toAccount: ReferencedAccount | null; category: ReferencedCategory | null }> {
  const { userId } = await requireSession();
  const accountSelect = { id: true, archivedAt: true } as const;
  const [account, toAccount, category] = await Promise.all([
    db.account.findUnique({ where: { id: data.accountId, userId }, select: accountSelect }),
    data.toAccountId ? db.account.findUnique({ where: { id: data.toAccountId, userId }, select: accountSelect }) : null,
    data.categoryId
      ? db.category.findUnique({ where: { id: data.categoryId, userId }, select: { id: true, kind: true, archivedAt: true } })
      : null,
  ]);
  const toAccountRef = (row: { id: string; archivedAt: Date | null } | null) =>
    row ? { id: row.id, archived: row.archivedAt !== null } : null;
  return {
    account: toAccountRef(account),
    toAccount: toAccountRef(toAccount),
    category: category ? { id: category.id, kind: category.kind, archived: category.archivedAt !== null } : null,
  };
}

export async function findTransactionReferences(id: string) {
  const { userId } = await requireSession();
  return db.transaction.findUnique({ where: { id, userId }, select: { accountId: true, toAccountId: true, categoryId: true } });
}

export async function createTransaction(data: TransactionData): Promise<void> {
  const { userId } = await requireSession();
  await db.transaction.create({ data: { ...data, userId } });
}

export async function updateTransaction(id: string, data: TransactionData): Promise<void> {
  const { userId } = await requireSession();
  await db.transaction.update({ where: { id, userId }, data });
}

/** Returns false when the transaction no longer exists. */
export async function deleteTransaction(id: string): Promise<boolean> {
  const { userId } = await requireSession();
  const { count } = await db.transaction.deleteMany({ where: { id, userId } });
  return count > 0;
}

export async function setTransactionStatus(id: string, status: TransactionStatus): Promise<boolean> {
  const { userId } = await requireSession();
  const { count } = await db.transaction.updateMany({ where: { id, userId }, data: { status } });
  return count > 0;
}
