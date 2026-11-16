import type { TransactionType } from "./types";

export type TransactionShape = {
  type: TransactionType;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
};

export type ShapeIssue = { field: "toAccountId" | "categoryId"; message: string };

/**
 * Same rules as the CHECK constraints of the migration:
 * TRANSFER → destination account (≠ source), no category;
 * EXPENSE / INCOME → category, no destination account.
 */
export function checkTransactionShape({ type, accountId, toAccountId, categoryId }: TransactionShape): ShapeIssue[] {
  const issues: ShapeIssue[] = [];
  if (type === "TRANSFER") {
    if (!toAccountId) issues.push({ field: "toAccountId", message: "Compte de destination requis" });
    else if (toAccountId === accountId)
      issues.push({ field: "toAccountId", message: "Le compte de destination doit être différent" });
    if (categoryId) issues.push({ field: "categoryId", message: "Un virement n'a pas de catégorie" });
  } else {
    if (!categoryId) issues.push({ field: "categoryId", message: "Catégorie requise" });
    if (toAccountId) issues.push({ field: "toAccountId", message: "Seul un virement a un compte de destination" });
  }
  return issues;
}
