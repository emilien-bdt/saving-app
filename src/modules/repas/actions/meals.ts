"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import { findOrCreateDish, getDishOptions } from "../data/dishes";
import * as repository from "../data/meals";
import { generateMenu } from "../domain/generator";
import { type MealCell, fillableSlots, moveMeal as planMove } from "../domain/grid";
import { parseWeekParam, slotKey } from "../domain/week";
import { fieldErrorsOf, type MealInput, mealInputSchema, type SlotRefInput, slotRefSchema, weekSchema } from "../schemas/meal";

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors: Record<string, string> };

const failure = (error: string, fieldErrors: Record<string, string> = {}): ActionResult => ({ ok: false, error, fieldErrors });

/** Repas pages + the home dashboard (its widget shows today's meals). */
function revalidateRepas(): void {
  revalidatePath("/repas", "layout");
  revalidatePath("/");
}

function parseWeek(week: string): Date | null {
  const parsed = weekSchema.safeParse(week);
  return parsed.success ? parseWeekParam(parsed.data) : null;
}

export async function saveMeal(ref: SlotRefInput, input: MealInput): Promise<ActionResult> {
  await requireSession();
  const slot = slotRefSchema.safeParse(ref);
  if (!slot.success) return failure("Case introuvable");
  const parsed = mealInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    return failure(Object.values(fieldErrors)[0] ?? "Repas invalide", fieldErrors);
  }
  const data = parsed.data;
  const status = data.validated ? "VALIDATED" : "PROPOSED";
  if (data.kind === "OUT") {
    await repository.upsertMeal(slot.data, { kind: "OUT", dishId: null, label: data.label, note: data.note, status });
  } else {
    const dishId = await findOrCreateDish(data.dishName);
    await repository.upsertMeal(slot.data, { kind: data.kind, dishId, label: null, note: data.note, status });
  }
  revalidateRepas();
  return { ok: true };
}

export async function clearMeal(ref: SlotRefInput): Promise<ActionResult> {
  await requireSession();
  const slot = slotRefSchema.safeParse(ref);
  if (!slot.success) return failure("Case introuvable");
  await repository.deleteMeal(slot.data);
  revalidateRepas();
  return { ok: true };
}

export async function setMealValidated(ref: SlotRefInput, validated: boolean): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ ref: slotRefSchema, validated: z.boolean() }).safeParse({ ref, validated });
  if (!parsed.success || !(await repository.setMealStatus(parsed.data.ref, validated ? "VALIDATED" : "PROPOSED"))) {
    return failure("Cette case est vide");
  }
  revalidateRepas();
  return { ok: true };
}

export async function setWeekValidated(week: string, validated: boolean): Promise<ActionResult> {
  await requireSession();
  const monday = parseWeek(week);
  if (!monday || typeof validated !== "boolean") return failure("Semaine invalide");
  await repository.setWeekStatus(monday, validated ? "VALIDATED" : "PROPOSED");
  revalidateRepas();
  return { ok: true };
}

/** Drag and drop: move onto an empty slot, swap with a filled one. */
export async function moveMeal(from: SlotRefInput, to: SlotRefInput): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ from: slotRefSchema, to: slotRefSchema }).safeParse({ from, to });
  if (!parsed.success) return failure("Déplacement impossible");
  const { from: source, to: target } = parsed.data;
  const rows = await repository.getMealsBetween(
    new Date(Math.min(source.date.getTime(), target.date.getTime())),
    new Date(Math.max(source.date.getTime(), target.date.getTime())),
  );
  await repository.applyChanges(planMove(rows, source, target));
  revalidateRepas();
  return { ok: true };
}

/**
 * Fills the week's empty and proposed slots (or only `only`) from the history.
 * Validated meals never change. A single slot is regenerated against the
 * whole week, so the new dish differs from the other ones.
 */
export async function generateWeek(week: string, only: SlotRefInput | null = null): Promise<ActionResult> {
  await requireSession();
  const monday = parseWeek(week);
  if (!monday) return failure("Semaine invalide");
  const onlyRef = only === null ? null : slotRefSchema.safeParse(only);
  if (onlyRef && !onlyRef.success) return failure("Case introuvable");

  const [rows, history, dishes] = await Promise.all([repository.getWeekMeals(monday), repository.getHistory(monday), getDishOptions()]);
  if (dishes.length === 0) return failure("Aucun plat connu : saisis quelques repas ou importe ton historique");

  const cells: MealCell[] = rows;
  const slots = fillableSlots(monday, cells, onlyRef?.data);
  if (slots.length === 0) return failure(onlyRef ? "Ce repas est validé" : "Toute la semaine est déjà validée");
  const targeted = new Set(slots.map(slotKey));
  const fixed = cells.filter((cell) => !targeted.has(slotKey(cell)) && (cell.status === "VALIDATED" || onlyRef !== null || cell.date < monday));

  const proposals = generateMenu({
    monday,
    slots,
    fixed,
    history,
    dishes,
    seed: Date.now() % 4_294_967_296,
  });
  await repository.replaceProposals(slots, proposals);
  revalidateRepas();
  return { ok: true };
}

