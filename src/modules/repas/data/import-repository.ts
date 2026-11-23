import { db } from "@/shared/lib/db";
import { dishKey } from "../domain/dish-key";
import type { SuggestedIngredient } from "../domain/ingredient-suggestions";
import { guessAisle, ingredientKey } from "../domain/ingredients";
import { toIsoDate } from "../domain/week";
import type { ResolvedMeal } from "../import/excel/parse-menu";

export const importRefOf = (meal: { date: Date; slot: string }) => `excel:${toIsoDate(meal.date)}:${meal.slot}`;

/**
 * Writes the imported history: dishes (one per normalised name) then meals,
 * validated. A slot already filled (by hand or by a previous import) is kept.
 */
export async function applyMenuImport(
  meals: readonly ResolvedMeal[],
  catalogue: ReadonlyMap<string, string>,
): Promise<{ dishes: number; created: number; skipped: number }> {
  const dishIds = new Map<string, string>();
  for (const [key, name] of catalogue) {
    const dish = await db.repasDish.upsert({ where: { key }, create: { key, name }, update: {}, select: { id: true } });
    dishIds.set(key, dish.id);
  }

  const data = meals.map((meal) =>
    meal.kind === "OUT"
      ? { date: meal.date, slot: meal.slot, kind: meal.kind, dishId: null, label: meal.label, note: meal.note, status: "VALIDATED" as const, importRef: importRefOf(meal) }
      : {
          date: meal.date,
          slot: meal.slot,
          kind: meal.kind,
          dishId: dishIds.get(dishKey(meal.dishName)) ?? null,
          label: null,
          note: meal.note,
          status: "VALIDATED" as const,
          importRef: importRefOf(meal),
        },
  );
  const { count } = await db.repasMeal.createMany({ data, skipDuplicates: true });
  return { dishes: catalogue.size, created: count, skipped: data.length - count };
}

/** Removes the imported meals (manual ones stay) and the dishes left unused. */
export async function deleteMenuImports(): Promise<number> {
  const { count } = await db.repasMeal.deleteMany({ where: { importRef: { not: null } } });
  await db.repasDish.deleteMany({ where: { meals: { none: {} } } });
  return count;
}

/**
 * Ingredients guessed from the Excel shopping notes, for dishes that have none
 * yet (a dish already filled in by hand is never touched). Marked "suggested".
 */
export async function applyIngredientSuggestions(suggestions: ReadonlyMap<string, readonly SuggestedIngredient[]>): Promise<number> {
  let filled = 0;
  for (const [key, items] of suggestions) {
    const dish = await db.repasDish.findUnique({ where: { key }, select: { id: true, _count: { select: { ingredients: true } } } });
    if (!dish || dish._count.ingredients > 0 || items.length === 0) continue;
    for (const [index, item] of items.entries()) {
      const ingredient = await db.repasIngredient.upsert({
        where: { key: ingredientKey(item.name) },
        create: {
          key: ingredientKey(item.name),
          name: item.name,
          aisle: guessAisle(item.name),
          unit: item.quantity?.unit ?? "PIECE",
        },
        update: {},
        select: { id: true, unit: true },
      });
      await db.repasDishIngredient.createMany({
        data: [
          {
            dishId: dish.id,
            ingredientId: ingredient.id,
            amount: item.quantity && item.quantity.unit === ingredient.unit ? item.quantity.amount : null,
            suggested: true,
            sortOrder: index,
          },
        ],
        skipDuplicates: true,
      });
    }
    filled++;
  }
  return filled;
}
