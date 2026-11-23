// Home-made menu generator (no external AI). Fills the given slots from the
// history of meals, chronologically, so that a generated dinner can feed the
// next lunch as a leftover.
//
// Weight of a dish = seasonal frequency × recency × variety:
// - seasonal frequency: 0.5 + Σ over past cooked occurrences of a cosine of
//   the month distance (same month = 1, six months away = 0);
// - recency: days since last eaten / 28, capped at 1, floored at 0.05; a dish
//   already in the week is excluded;
// - variety: × 0.4 per dish of the week sharing its main word ("pates").
// A lunch after a home-cooked dinner becomes its leftover with the
// probability observed in the history.

import { dishKey, mainIngredientWord } from "./dish-key";
import type { MealCell, MealKind } from "./grid";
import { type SlotRef, diffInDays, previousSlot, slotKey } from "./week";

export type HistoryMeal = { date: Date; slot: SlotRef["slot"]; kind: MealKind; dishId: string | null };
export type CandidateDish = { id: string; name: string };
export type Proposal = { ref: SlotRef; kind: "DISH" | "LEFTOVER"; dishId: string };

export type GenerateInput = {
  monday: Date;
  slots: readonly SlotRef[];
  /** Meals of the week (and the day before) that stay: validated or not targeted. */
  fixed: readonly MealCell[];
  history: readonly HistoryMeal[];
  dishes: readonly CandidateDish[];
  seed: number;
  /** Overrides the leftover probability computed from the history. */
  leftoverRate?: number;
};

/** Deterministic PRNG (mulberry32): same seed → same menu, for tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Share of lunches following a cooked dinner that were its leftover. */
export function observedLeftoverRate(history: readonly HistoryMeal[]): number {
  const byKey = new Map(history.map((meal) => [slotKey(meal), meal]));
  let cooked = 0;
  let leftovers = 0;
  for (const lunch of history) {
    if (lunch.slot !== "LUNCH" || lunch.kind === "OUT") continue;
    const dinner = byKey.get(slotKey(previousSlot(lunch)));
    if (!dinner || dinner.kind !== "DISH") continue;
    cooked++;
    if (lunch.kind === "LEFTOVER" && lunch.dishId === dinner.dishId) leftovers++;
  }
  return cooked === 0 ? 0.5 : leftovers / cooked;
}

function monthDistance(a: Date, b: Date): number {
  const diff = Math.abs(a.getUTCMonth() - b.getUTCMonth());
  return Math.min(diff, 12 - diff);
}

export function generateMenu(input: GenerateInput): Proposal[] {
  const random = seededRandom(input.seed);
  const leftoverRate = input.leftoverRate ?? observedLeftoverRate(input.history);
  const reference = input.monday;

  const seasonal = new Map<string, number>();
  const lastEaten = new Map<string, Date>();
  for (const meal of input.history) {
    if (!meal.dishId || meal.date >= reference) continue;
    const last = lastEaten.get(meal.dishId);
    if (!last || meal.date > last) lastEaten.set(meal.dishId, meal.date);
    if (meal.kind !== "DISH") continue;
    const weight = 0.5 + 0.5 * Math.cos((2 * Math.PI * monthDistance(meal.date, reference)) / 12);
    seasonal.set(meal.dishId, (seasonal.get(meal.dishId) ?? 0) + weight);
  }

  const dishById = new Map(input.dishes.map((dish) => [dish.id, dish]));
  const planned = new Map<string, { kind: MealKind; dishId: string | null }>();
  for (const cell of input.fixed) planned.set(slotKey(cell), { kind: cell.kind, dishId: cell.dishId });

  const weekDishIds = () =>
    new Set([...planned.values()].filter((m) => m.kind === "DISH" && m.dishId).map((m) => m.dishId as string));

  const proposals: Proposal[] = [];
  const ordered = [...input.slots].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || (a.slot === "LUNCH" ? -1 : 1),
  );

  for (const ref of ordered) {
    const before = planned.get(slotKey(previousSlot(ref)));
    if (ref.slot === "LUNCH" && before?.kind === "DISH" && before.dishId && random() < leftoverRate) {
      planned.set(slotKey(ref), { kind: "LEFTOVER", dishId: before.dishId });
      proposals.push({ ref, kind: "LEFTOVER", dishId: before.dishId });
      continue;
    }

    const inWeek = weekDishIds();
    const weekWords = [...inWeek].map((id) => mainIngredientWord(dishKey(dishById.get(id)?.name ?? "")));
    const weighted: { id: string; weight: number }[] = [];
    for (const dish of input.dishes) {
      if (inWeek.has(dish.id)) continue;
      const last = lastEaten.get(dish.id);
      const days = last ? diffInDays(ref.date, last) : 60;
      const recency = Math.max(0.05, Math.min(1, days / 28));
      const word = mainIngredientWord(dishKey(dish.name));
      const variety = 0.4 ** weekWords.filter((w) => w === word).length;
      weighted.push({ id: dish.id, weight: (0.5 + (seasonal.get(dish.id) ?? 0)) * recency * variety });
    }
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    if (total <= 0) continue;

    let threshold = random() * total;
    let chosen = weighted[weighted.length - 1];
    for (const item of weighted) {
      threshold -= item.weight;
      if (threshold <= 0) {
        chosen = item;
        break;
      }
    }
    if (!chosen) continue;
    planned.set(slotKey(ref), { kind: "DISH", dishId: chosen.id });
    proposals.push({ ref, kind: "DISH", dishId: chosen.id });
  }
  return proposals;
}
