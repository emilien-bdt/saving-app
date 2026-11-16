"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import * as repository from "../data/accounts";
import { checkAccountSave, checkArchive, checkDelete, checkUnarchive, moveAccount as computeMove } from "../domain/accounts";
import { type AccountInput, accountInputSchema } from "../schemas/account";
import type { ActionResult } from "./transactions";

const revalidateFinances = () => revalidatePath("/finances", "layout");
const idSchema = z.string().min(1).max(64);

const failure = (error: string, fieldErrors: Record<string, string> = {}): ActionResult => ({ ok: false, error, fieldErrors });

/** Creates (id = null) or updates an account / pocket. */
export async function saveAccount(id: string | null, input: AccountInput): Promise<ActionResult> {
  await requireSession();
  const accountId = id === null ? null : idSchema.safeParse(id);
  if (accountId && !accountId.success) return failure("Compte introuvable");

  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return failure("Vérifie les champs en rouge", fieldErrors);
  }
  const data = parsed.data;

  const accounts = await repository.getAccountStates();
  const issues = checkAccountSave({ id: accountId?.data ?? null, name: data.name, parentId: data.parentId }, accounts);
  if (issues.length > 0) {
    return failure(issues[0]?.message ?? "Compte invalide", Object.fromEntries(issues.map((issue) => [issue.field, issue.message])));
  }

  if (accountId) await repository.updateAccount(accountId.data, data, accounts);
  else await repository.createAccount(data, accounts);
  revalidateFinances();
  return { ok: true };
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionResult> {
  await requireSession();
  const parsedId = idSchema.safeParse(id);
  const parsedArchived = z.boolean().safeParse(archived);
  if (!parsedId.success || !parsedArchived.success) return failure("Requête invalide");

  const accounts = await repository.getAccountStates();
  const issue = parsedArchived.data ? checkArchive(parsedId.data, accounts) : checkUnarchive(parsedId.data, accounts);
  if (issue) return failure(issue);
  await repository.setAccountArchived(parsedId.data, parsedArchived.data);
  revalidateFinances();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  await requireSession();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return failure("Requête invalide");

  const issue = checkDelete(parsedId.data, await repository.getAccountStates());
  if (issue) return failure(issue);
  await repository.deleteAccount(parsedId.data);
  revalidateFinances();
  return { ok: true };
}

export async function moveAccount(id: string, direction: number): Promise<ActionResult> {
  await requireSession();
  const parsedId = idSchema.safeParse(id);
  const parsedDirection = z.union([z.literal(-1), z.literal(1)]).safeParse(direction);
  if (!parsedId.success || !parsedDirection.success) return failure("Requête invalide");

  const updates = computeMove(parsedId.data, parsedDirection.data, await repository.getAccountStates());
  if (updates === null) return failure("Ce compte n'existe plus");
  if (updates.length > 0) {
    await repository.setSortOrders(updates);
    revalidateFinances();
  }
  return { ok: true };
}
