"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import * as repository from "../data/shopping";
import { parseWeekParam } from "../domain/week";
import { weekSchema } from "../schemas/meal";
import type { ActionResult } from "./meals";

const failure = (error: string): ActionResult => ({ ok: false, error, fieldErrors: {} });
const idSchema = z.string().min(1).max(64);
const amountSchema = z.number().int("Quantité entière").positive("Quantité positive").max(100_000).nullable();

function revalidateShopping(): void {
  revalidatePath("/repas/courses");
  revalidatePath("/");
}

function mondayOf(week: string): Date | null {
  const parsed = weekSchema.safeParse(week);
  return parsed.success ? parseWeekParam(parsed.data) : null;
}

/** Wraps an action on one line of a week's list (session + validation + revalidation). */
async function onLine(week: string, ingredientId: string, run: (monday: Date, id: string) => Promise<void>): Promise<ActionResult> {
  await requireSession();
  const monday = mondayOf(week);
  if (!monday || !idSchema.safeParse(ingredientId).success) return failure("Article introuvable");
  await run(monday, ingredientId);
  revalidateShopping();
  return { ok: true };
}

/** Quick add by hand ("Sopalin", "Yaourts"…): an existing line is put back to buy. */
export async function addShoppingItem(week: string, name: string, amount: number | null = null): Promise<ActionResult> {
  await requireSession();
  const monday = mondayOf(week);
  const parsed = z.object({ name: z.string().trim().min(1, "Nom obligatoire").max(80, "80 caractères maximum"), amount: amountSchema }).safeParse({ name, amount });
  if (!monday) return failure("Semaine invalide");
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Article invalide");
  const ingredientId = await repository.findOrCreateIngredient(parsed.data.name);
  await repository.upsertItem(monday, ingredientId, "MANUAL", {
    removed: false,
    checked: false,
    ...(parsed.data.amount !== null ? { amount: parsed.data.amount } : {}),
  });
  revalidateShopping();
  return { ok: true };
}

/** A basic tapped in the chips row: added, or taken off when already added as a basic. */
export async function toggleStaple(week: string, ingredientId: string, add: boolean): Promise<ActionResult> {
  return onLine(week, ingredientId, (monday, id) =>
    add ? repository.upsertItem(monday, id, "STAPLE", { removed: false, checked: false }) : repository.deleteItem(monday, id),
  );
}

export async function setItemChecked(week: string, ingredientId: string, checked: boolean): Promise<ActionResult> {
  if (typeof checked !== "boolean") return failure("Valeur invalide");
  return onLine(week, ingredientId, (monday, id) => repository.upsertItem(monday, id, "MEALS", { checked }));
}

/** amount = null: back to the computed quantity. */
export async function setItemAmount(week: string, ingredientId: string, amount: number | null): Promise<ActionResult> {
  const parsed = amountSchema.safeParse(amount);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Quantité invalide");
  return onLine(week, ingredientId, (monday, id) => repository.upsertItem(monday, id, "MEALS", { amount: parsed.data }));
}

/** computed: "déjà au placard" (kept, restorable); otherwise the line is deleted. */
export async function removeItem(week: string, ingredientId: string, computed: boolean): Promise<ActionResult> {
  return onLine(week, ingredientId, (monday, id) =>
    computed ? repository.markRemoved(monday, id, true) : repository.deleteItem(monday, id),
  );
}

export async function restoreItem(week: string, ingredientId: string): Promise<ActionResult> {
  return onLine(week, ingredientId, (monday, id) => repository.markRemoved(monday, id, false));
}

export async function uncheckAllItems(week: string): Promise<ActionResult> {
  await requireSession();
  const monday = mondayOf(week);
  if (!monday) return failure("Semaine invalide");
  await repository.uncheckAll(monday);
  revalidateShopping();
  return { ok: true };
}

/** Repas › Paramètres: adds an item to the basics, or removes it. */
export async function setStapleItem(name: string, staple: boolean): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ name: z.string().trim().min(1, "Nom obligatoire").max(80), staple: z.boolean() }).safeParse({ name, staple });
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Nom invalide");
  await repository.setStaple(parsed.data.name, parsed.data.staple);
  revalidatePath("/repas", "layout");
  return { ok: true };
}
