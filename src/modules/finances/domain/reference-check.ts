import type { CategoryKind, TransactionType } from "./types";

export type ReferencedAccount = { id: string; archived: boolean };
export type ReferencedCategory = { id: string; kind: CategoryKind; archived: boolean };

export type ReferenceIssue = { field: "accountId" | "toAccountId" | "categoryId"; message: string };

/**
 * Checks the accounts / category a transaction points to. Archived ones are
 * refused, except those the edited transaction already used (`keptIds`).
 */
export function checkReferences(input: {
  type: TransactionType;
  account: ReferencedAccount | null;
  toAccount: ReferencedAccount | null;
  category: ReferencedCategory | null;
  keptIds?: ReadonlySet<string>;
}): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  const kept = (id: string) => input.keptIds?.has(id) ?? false;

  if (!input.account) issues.push({ field: "accountId", message: "Compte introuvable" });
  else if (input.account.archived && !kept(input.account.id))
    issues.push({ field: "accountId", message: "Ce compte est archivé" });

  if (input.type === "TRANSFER") {
    if (!input.toAccount) issues.push({ field: "toAccountId", message: "Compte de destination introuvable" });
    else if (input.toAccount.archived && !kept(input.toAccount.id))
      issues.push({ field: "toAccountId", message: "Le compte de destination est archivé" });
    return issues;
  }

  if (!input.category) issues.push({ field: "categoryId", message: "Catégorie introuvable" });
  else if (input.category.kind !== input.type)
    issues.push({
      field: "categoryId",
      message: input.type === "EXPENSE" ? "Choisis une catégorie de dépense" : "Choisis une catégorie de revenu",
    });
  else if (input.category.archived && !kept(input.category.id))
    issues.push({ field: "categoryId", message: "Cette catégorie est archivée" });
  return issues;
}
