/**
 * Domain types, deliberately independent from Prisma (same string unions as
 * the Prisma enums, so Prisma rows are assignable to them).
 */

export const ACCOUNT_TYPES = ["CHECKING", "SAVINGS"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CATEGORY_KINDS = ["EXPENSE", "INCOME"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const TRANSACTION_TYPES = ["EXPENSE", "INCOME", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["PLANNED", "CLEARED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
