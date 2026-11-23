import { db } from "@/shared/lib/db";
import type { HistoryMeal, Proposal } from "../domain/generator";
import type { MealCell, MealKind, MealStatus, SlotChange } from "../domain/grid";
import { type MealSlot, type SlotRef, addDays, toIsoDate } from "../domain/week";
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
  sides: { orderBy: { sortOrder: "asc" }, select: { ingredient: { select: { id: true, name: true } } } },
} as const;

export type MealRow = {
  date: Date;
  slot: MealSlot;
  kind: MealKind;
  dishId: string | null;
  label: string | null;
  note: string | null;
  status: MealStatus;
  dish: { name: string } | null;
  sides: { ingredient: { id: string; name: string } }[];
};

/** Row → cell of the pure grid functions (sides as ingredient ids). */
export function toCell(row: MealRow): MealCell {
  return { ...row, sides: row.sides.map((side) => side.ingredient.id) };
}

export function toView(row: MealRow): MealView {
  return {
    dateIso: toIsoDate(row.date),
    slot: row.slot,
    kind: row.kind,
    dishId: row.dishId,
    dishName: row.dish?.name ?? null,
    sides: row.sides.map((side) => side.ingredient),
    label: row.label,
    note: row.note,
    status: row.status,
  };
}

const sidesCreate = (sides: readonly string[]) => ({
  create: sides.map((ingredientId, sortOrder) => ({ ingredientId, sortOrder })),
});

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
  const rows = await db.repasMeal.findMany({
    where: { OR: [{ date: { lt: monday } }, { date: { gt: addDays(monday, 6) } }] },
    select: { date: true, slot: true, kind: true, dishId: true, sides: { select: { ingredientId: true } } },
  });
  return rows.map((row) => ({ ...row, sides: row.sides.map((side) => side.ingredientId) }));
}

export type MealData = Omit<MealCell, "date" | "slot">;

/** Creates or replaces the meal of a slot (sides included). */
export async function upsertMeal(ref: SlotRef, data: MealData): Promise<void> {
  const { sides, ...meal } = data;
  await db.$transaction([
    db.repasMeal.deleteMany({ where: { date: ref.date, slot: ref.slot } }),
    db.repasMeal.create({ data: { ...ref, ...meal, sides: sidesCreate(sides) } }),
  ]);
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
    ...changes.flatMap(({ ref, cell }) => {
      if (!cell) return [];
      const { sides, ...meal } = cell;
      return [db.repasMeal.create({ data: { ...ref, ...meal, sides: sidesCreate(sides) } })];
    }),
  ]);
}

/** Replaces the targeted slots by the generator's proposals (one transaction). */
export async function replaceProposals(targets: readonly SlotRef[], proposals: readonly Proposal[]): Promise<void> {
  if (targets.length === 0) return;
  await db.$transaction([
    db.repasMeal.deleteMany({ where: { status: "PROPOSED", OR: targets.map((ref) => ({ date: ref.date, slot: ref.slot })) } }),
    ...proposals.map((proposal) =>
      db.repasMeal.create({
        data: {
          date: proposal.ref.date,
          slot: proposal.ref.slot,
          kind: proposal.kind,
          dishId: proposal.dishId,
          status: "PROPOSED",
          sides: sidesCreate(proposal.sides),
        },
      }),
    ),
  ]);
}
