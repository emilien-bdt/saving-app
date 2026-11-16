"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import * as repository from "../data/transactions";
import { checkReferences } from "../domain/reference-check";
import { TRANSACTION_STATUSES } from "../domain/types";
import { type TransactionInput, transactionInputSchema } from "../schemas/transaction";

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors: Record<string, string> };

const revalidateFinances = () => revalidatePath("/finances", "layout");
const idSchema = z.string().min(1).max(64);

const failure = (error: string, fieldErrors: Record<string, string> = {}): ActionResult => ({
  ok: false,
  error,
  fieldErrors,
});

/** Creates (id = null) or updates a transaction. */
export async function saveTransaction(id: string | null, input: TransactionInput): Promise<ActionResult> {
  await requireSession();
  const transactionId = id === null ? null : idSchema.safeParse(id);
  if (transactionId && !transactionId.success) return failure("Transaction introuvable");

  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return failure("Vérifie les champs en rouge", fieldErrors);
  }
  const data = parsed.data;

  const existing = transactionId ? await repository.findTransactionReferences(transactionId.data) : null;
  if (transactionId && !existing) return failure("Cette transaction n'existe plus");

  const keptIds = new Set(
    [existing?.accountId, existing?.toAccountId, existing?.categoryId].filter((value): value is string => Boolean(value)),
  );
  const issues = checkReferences({ type: data.type, ...(await repository.findReferences(data)), keptIds });
  if (issues.length > 0) {
    return failure(issues[0]?.message ?? "Référence invalide", Object.fromEntries(issues.map((issue) => [issue.field, issue.message])));
  }

  if (transactionId) await repository.updateTransaction(transactionId.data, data);
  else await repository.createTransaction(data);
  revalidateFinances();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  await requireSession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success || !(await repository.deleteTransaction(parsed.data))) {
    return failure("Cette transaction n'existe plus");
  }
  revalidateFinances();
  return { ok: true };
}

export async function setTransactionStatus(id: string, status: string): Promise<ActionResult> {
  await requireSession();
  const parsedId = idSchema.safeParse(id);
  const parsedStatus = z.enum(TRANSACTION_STATUSES).safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return failure("Requête invalide");
  if (!(await repository.setTransactionStatus(parsedId.data, parsedStatus.data))) {
    return failure("Cette transaction n'existe plus");
  }
  revalidateFinances();
  return { ok: true };
}
