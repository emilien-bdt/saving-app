import { db } from "@/shared/lib/db";
import type { HistoryMeal, Proposal } from "../domain/generator";
import type { MealCell, MealStatus, SlotChange } from "../domain/grid";
import { type SlotRef, addDays, toIsoDate } from "../domain/week";
import type { MealView } from "../view-models";

const mealSelect = {
  date: true,
  slot: true,
  kind: true,
  dishId: true,
  label: true,
  note: true,
  status: true,
  dish: { select: { name: true } },
} as const;

type MealRow = MealCell & { dish: { name: string } | null };

export function toView(row: MealRow): MealView {
  return {
    dateIso: toIsoDate(row.date),
    slot: row.slot,
    kind: row.kind,
    dishId: row.dishId,
    dishName: row.dish?.name ?? null,
    label: row.label,
    note: row.note,
    status: row.status,
  };
}

const slotWhere = (ref: SlotRef) => ({ date_slot: { date: ref.date, slot: ref.slot } });

/** Meals from `from` to `to` included. */
export async function getMealsBetween(from: Date, to: Date): Promise<MealRow[]> {
  return db.repasMeal.findMany({ where: { date: { gte: from, lte: to } }, select: mealSelect, orderBy: [{ date: "asc" }, { slot: "asc" }] });
}

/** The week plus the day before (Monday lunch can be Sunday's leftover). */
export async function getWeekMeals(monday: Date): Promise<MealRow[]> {
  return getMealsBetween(addDays(monday, -1), addDays(monday, 6));
}

/** Every meal outside the week: the generator's history. */
export async function getHistory(monday: Date): Promise<HistoryMeal[]> {
  return db.repasMeal.findMany({
    where: { OR: [{ date: { lt: monday } }, { date: { gt: addDays(monday, 6) } }] },
    select: { date: true, slot: true, kind: true, dishId: true },
  });
}

export type MealData = Omit<MealCell, "date" | "slot">;

export async function upsertMeal(ref: SlotRef, data: MealData): Promise<void> {
  await db.repasMeal.upsert({ where: slotWhere(ref), create: { ...ref, ...data }, update: { ...data, importRef: null } });
}

export async function deleteMeal(ref: SlotRef): Promise<void> {
  await db.repasMeal.deleteMany({ where: { date: ref.date, slot: ref.slot } });
}

/** false when the slot is empty. */
export async function setMealStatus(ref: SlotRef, status: MealStatus): Promise<boolean> {
  const { count } = await db.repasMeal.updateMany({ where: { date: ref.date, slot: ref.slot }, data: { status } });
  return count > 0;
}

export async function setWeekStatus(monday: Date, status: MealStatus): Promise<void> {
  await db.repasMeal.updateMany({ where: { date: { gte: monday, lte: addDays(monday, 6) } }, data: { status } });
}

/** Applies a move/swap atomically (the unique date+slot forbids in-place swaps). */
export async function applyChanges(changes: readonly SlotChange[]): Promise<void> {
  if (changes.length === 0) return;
  await db.$transaction([
    db.repasMeal.deleteMany({ where: { OR: changes.map(({ ref }) => ({ date: ref.date, slot: ref.slot })) } }),
    ...changes
      .filter((change) => change.cell !== null)
      .map(({ ref, cell }) => db.repasMeal.create({ data: { ...ref, ...(cell as MealData) } })),
  ]);
}

/** Replaces the targeted slots by the generator's proposals (one transaction). */
export async function replaceProposals(targets: readonly SlotRef[], proposals: readonly Proposal[]): Promise<void> {
  if (targets.length === 0) return;
  await db.$transaction([
    db.repasMeal.deleteMany({ where: { status: "PROPOSED", OR: targets.map((ref) => ({ date: ref.date, slot: ref.slot })) } }),
    ...proposals.map((proposal) =>
      db.repasMeal.create({
        data: { date: proposal.ref.date, slot: proposal.ref.slot, kind: proposal.kind, dishId: proposal.dishId, status: "PROPOSED" },
      }),
    ),
  ]);
}
