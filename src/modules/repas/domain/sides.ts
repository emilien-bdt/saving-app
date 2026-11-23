// A meal = an optional dish (the cooked recipe) + side items bought as they
// are (chips, salad, cucumber, feta…): "Croques monsieurs + chips" is the dish
// "Croques monsieurs" with the side "Chips"; "Concombre + feta" has no dish.

import { cleanDishName } from "./dish-key";
import { ingredientKey } from "./ingredients";

/** Initial side list (editable in Repas › Paramètres). */
export const DEFAULT_SIDES = [
  "Chips",
  "Salade",
  "Mâche",
  "Concombre",
  "Tomates",
  "Crudités",
  "Légumes",
  "Feta",
  "Mozza",
  "Pain",
  "Fromage",
  "Pastèque",
  "Melon",
] as const;

export const DEFAULT_SIDE_KEYS: ReadonlySet<string> = new Set(DEFAULT_SIDES.map(ingredientKey));

/**
 * Splits a meal name on "+", "&", "/" and "," into the dish and its sides.
 * A part is a side when its normalised name is in `sideKeys`; when no part is
 * a side the name is kept as it is ("Semoule, ratatouille, merguez").
 */
export function splitMealName(name: string, sideKeys: ReadonlySet<string> = DEFAULT_SIDE_KEYS): { dishName: string | null; sides: string[] } {
  const parts = splitTopLevel(name);
  const sides = parts.filter((part) => sideKeys.has(ingredientKey(part)));
  if (sides.length === 0) return { dishName: cleanDishName(name), sides: [] };
  const rest = parts.filter((part) => !sideKeys.has(ingredientKey(part)));
  const unique = new Map<string, string>();
  for (const side of sides) if (!unique.has(ingredientKey(side))) unique.set(ingredientKey(side), cleanDishName(side));
  return { dishName: rest.length > 0 ? cleanDishName(rest.join(" + ")) : null, sides: [...unique.values()] };
}

/** Splits on + & / , outside parentheses ("Salade de pâtes (feta + maïs)" stays whole). */
function splitTopLevel(name: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of name) {
    if (char === "(") depth++;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && "+&/,".includes(char)) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== "");
}

export type SideHistoryMeal = { kind: string; dishId: string | null; sides: readonly string[] };

/** Sides eaten with a dish at least half of the times it was cooked, most frequent first. */
export function habitualSides(history: readonly SideHistoryMeal[]): Map<string, string[]> {
  const cooked = new Map<string, number>();
  const withSide = new Map<string, Map<string, number>>();
  for (const meal of history) {
    if (meal.kind !== "DISH" || !meal.dishId) continue;
    cooked.set(meal.dishId, (cooked.get(meal.dishId) ?? 0) + 1);
    const counts = withSide.get(meal.dishId) ?? new Map<string, number>();
    for (const side of new Set(meal.sides)) counts.set(side, (counts.get(side) ?? 0) + 1);
    withSide.set(meal.dishId, counts);
  }
  const result = new Map<string, string[]>();
  for (const [dishId, counts] of withSide) {
    const total = cooked.get(dishId) ?? 0;
    const usual = [...counts.entries()]
      .filter(([, count]) => count * 2 >= total)
      .sort((a, b) => b[1] - a[1])
      .map(([side]) => side);
    if (usual.length > 0) result.set(dishId, usual);
  }
  return result;
}
