// The weekly grid: 7 days × lunch/dinner. Pure functions over plain cells;
// persistence lives in data/, the UI only renders what these return.

import { type MealSlot, type SlotRef, slotKey, weekSlots } from "./week";

export type MealKind = "DISH" | "LEFTOVER" | "OUT";
export type MealStatus = "PROPOSED" | "VALIDATED";

export type MealCell = {
  date: Date;
  slot: MealSlot;
  kind: MealKind;
  /** LEFTOVER: the cooked dish; DISH: the dish, or null for sides only ("concombre + feta"). */
  dishId: string | null;
  /** Ingredient ids of the side items (chips, salad…), in display order. */
  sides: readonly string[];
  /** OUT: "Absent", "Restaurant…". */
  label: string | null;
  note: string | null;
  status: MealStatus;
};

export type GridRow = { date: Date; lunch: MealCell | null; dinner: MealCell | null };

export function buildGrid(monday: Date, cells: readonly MealCell[]): GridRow[] {
  const byKey = new Map(cells.map((cell) => [slotKey(cell), cell]));
  const rows: GridRow[] = [];
  for (const ref of weekSlots(monday)) {
    if (ref.slot === "LUNCH") rows.push({ date: ref.date, lunch: null, dinner: null });
    const row = rows[rows.length - 1];
    if (!row) continue;
    const cell = byKey.get(slotKey(ref)) ?? null;
    if (ref.slot === "LUNCH") row.lunch = cell;
    else row.dinner = cell;
  }
  return rows;
}

/** Slots the generator may (re)fill: empty or merely proposed. */
export function fillableSlots(monday: Date, cells: readonly MealCell[], only?: SlotRef): SlotRef[] {
  const validated = new Set(cells.filter((c) => c.status === "VALIDATED").map(slotKey));
  return weekSlots(monday).filter(
    (ref) => !validated.has(slotKey(ref)) && (!only || slotKey(only) === slotKey(ref)),
  );
}

export type SlotChange = { ref: SlotRef; cell: Omit<MealCell, "date" | "slot"> | null };

/**
 * Drag and drop: moving onto an empty slot moves the meal, onto a filled one
 * swaps both. Status travels with the meal (a validated meal stays validated).
 */
export function moveMeal(cells: readonly MealCell[], from: SlotRef, to: SlotRef): SlotChange[] {
  if (slotKey(from) === slotKey(to)) return [];
  const byKey = new Map(cells.map((cell) => [slotKey(cell), cell]));
  const source = byKey.get(slotKey(from));
  if (!source) return [];
  const target = byKey.get(slotKey(to)) ?? null;
  const strip = (cell: MealCell): SlotChange["cell"] => ({
    kind: cell.kind,
    dishId: cell.dishId,
    sides: cell.sides,
    label: cell.label,
    note: cell.note,
    status: cell.status,
  });
  return [
    { ref: to, cell: strip(source) },
    { ref: from, cell: target ? strip(target) : null },
  ];
}
