import type { MealKind, MealStatus } from "./domain/grid";
import type { MealSlot } from "./domain/week";

/** Meal as the pages and client components see it (plain, serializable). */
export type MealView = {
  dateIso: string;
  slot: MealSlot;
  kind: MealKind;
  dishId: string | null;
  dishName: string | null;
  label: string | null;
  note: string | null;
  status: MealStatus;
};

export type DishOption = { id: string; name: string; count: number };
