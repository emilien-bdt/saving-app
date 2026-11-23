import type { MealKind, MealStatus } from "./domain/grid";
import type { Aisle, Unit } from "./domain/ingredients";
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

export type DishIngredientView = {
  ingredientId: string;
  name: string;
  /** In `unit`, for one meal for 2; null = not known yet. */
  amount: number | null;
  unit: Unit;
  aisle: Aisle;
  suggested: boolean;
};

export type DishItem = {
  id: string;
  name: string;
  archived: boolean;
  /** Times cooked (leftovers not counted). */
  cooked: number;
  /** Every meal using it (cooked + leftovers). */
  meals: number;
  lastIso: string | null;
  ingredients: DishIngredientView[];
  /** Probably the same dish under another name (domain/ingredients.ts). */
  duplicateOf: { id: string; name: string } | null;
};

export type IngredientOption = { id: string; name: string; unit: Unit; aisle: Aisle; packAmount: number | null };
