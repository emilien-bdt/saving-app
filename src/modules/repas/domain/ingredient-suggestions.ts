// First guess of each dish's ingredients from the old Excel files: the
// shopping notes of a day usually sit next to the dish cooked that day
// (the dinner, or the lunch when there is no home-cooked dinner).

import { dishKey } from "./dish-key";
import { type Quantity, ingredientKey, parseIngredient } from "./ingredients";
import { type MealSlot, toIsoDate } from "./week";

export type SuggestionMeal = { date: Date; slot: MealSlot; kind: "DISH" | "LEFTOVER" | "OUT"; dishName: string | null };
export type SuggestionLine = { date: Date; label: string };
export type SuggestedIngredient = { name: string; quantity: Quantity | null; seen: number };

const MAX_PER_DISH = 10;

/** dish key → suggested ingredients, most often bought first. */
export function suggestDishIngredients(
  meals: readonly SuggestionMeal[],
  lines: readonly SuggestionLine[],
): Map<string, SuggestedIngredient[]> {
  const cookedByDay = new Map<string, string>();
  for (const meal of meals) {
    if (meal.kind !== "DISH" || !meal.dishName) continue;
    const day = toIsoDate(meal.date);
    // The dinner wins over the lunch of the same day.
    if (meal.slot === "DINNER" || !cookedByDay.has(day)) cookedByDay.set(day, dishKey(meal.dishName));
  }

  const perDish = new Map<string, Map<string, SuggestedIngredient>>();
  for (const line of lines) {
    const dish = cookedByDay.get(toIsoDate(line.date));
    if (!dish) continue;
    const parsed = parseIngredient(line.label);
    const key = ingredientKey(parsed.name);
    if (key.length < 2) continue;
    const ingredients = perDish.get(dish) ?? new Map<string, SuggestedIngredient>();
    const known = ingredients.get(key);
    if (known) {
      known.seen += 1;
      known.quantity ??= parsed.quantity;
    } else {
      ingredients.set(key, { name: parsed.name, quantity: parsed.quantity, seen: 1 });
    }
    perDish.set(dish, ingredients);
  }

  const result = new Map<string, SuggestedIngredient[]>();
  for (const [dish, ingredients] of perDish) {
    result.set(
      dish,
      [...ingredients.values()].sort((a, b) => b.seen - a.seen || a.name.localeCompare(b.name, "fr")).slice(0, MAX_PER_DISH),
    );
  }
  return result;
}
