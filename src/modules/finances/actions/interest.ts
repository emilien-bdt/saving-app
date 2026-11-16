"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import * as repository from "../data/interest";
import { accountGroupOf } from "../domain/accounts";
import { type InterestRateInput, interestRateInputSchema } from "../schemas/interest-rate";
import type { ActionResult } from "./transactions";

const revalidateFinances = () => revalidatePath("/finances", "layout");
const idSchema = z.string().min(1).max(64);
const failure = (error: string, fieldErrors: Record<string, string> = {}): ActionResult => ({ ok: false, error, fieldErrors });

/** Adds a rate from a date (past dates allowed: interest is recomputed); same date = replaced. */
export async function saveInterestRate(accountId: string, input: InterestRateInput): Promise<ActionResult> {
  await requireSession();
  const parsedId = idSchema.safeParse(accountId);
  if (!parsedId.success) return failure("Compte introuvable");
  const parsed = interestRateInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return failure(Object.values(fieldErrors)[0] ?? "Taux invalide", fieldErrors);
  }

  const account = await repository.findAccountForRates(parsedId.data);
  if (!account) return failure("Ce compte n'existe plus");
  if (accountGroupOf(account) !== "SAVINGS") return failure("Les intérêts concernent les comptes d'épargne");

  await repository.upsertInterestRate(account.id, parsed.data.validFrom, parsed.data.rate);
  revalidateFinances();
  return { ok: true };
}

export async function deleteInterestRate(id: string): Promise<ActionResult> {
  await requireSession();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success || !(await repository.deleteInterestRate(parsedId.data))) return failure("Ce taux n'existe plus");
  revalidateFinances();
  return { ok: true };
}
