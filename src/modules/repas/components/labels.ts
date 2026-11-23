import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { MealSlot } from "../domain/week";
import type { MealView } from "../view-models";

export const SLOT_LABELS: Record<MealSlot, string> = { LUNCH: "Midi", DINNER: "Soir" };

const atNoon = (dateIso: string) => new Date(`${dateIso}T12:00:00`);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Lundi 23" */
export function dayLabel(dateIso: string): string {
  return capitalize(format(atNoon(dateIso), "EEEE d", { locale: fr }));
}

/** "Lundi 23 novembre" */
export function longDayLabel(dateIso: string): string {
  return capitalize(format(atNoon(dateIso), "EEEE d MMMM", { locale: fr }));
}

/** "23 – 29 novembre 2026", "30 novembre – 6 décembre 2026" */
export function weekTitle(mondayIso: string, sundayIso: string): string {
  const monday = atNoon(mondayIso);
  const sunday = atNoon(sundayIso);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const start = format(monday, sameMonth ? "d" : monday.getFullYear() === sunday.getFullYear() ? "d MMMM" : "d MMMM yyyy", { locale: fr });
  return `${start} – ${format(sunday, "d MMMM yyyy", { locale: fr })}`;
}

/** What a cell says: the dish, "Reste : …" or the absence label. */
export function mealTitle(meal: MealView): string {
  if (meal.kind === "OUT") return meal.label ?? "Absent";
  return meal.dishName ?? "Plat";
}

/** Food-like clay colours: tomato, carrot, butter, pea, mint, blueberry, plum, beetroot. */
const FOOD_HUES = [30, 55, 92, 135, 170, 250, 305, 350] as const;

/** Stable colour per dish (the same dish looks the same everywhere). */
export function dishHue(dishId: string): number {
  let hash = 0;
  for (const char of dishId) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return FOOD_HUES[hash % FOOD_HUES.length] ?? 55;
}
