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
  householdId: string,
): Promise<{ dishes: number; created: number; skipped: number }> {
  const dishIds = new Map<string, string>();
  for (const [key, name] of catalogue) {
    const dish = await db.repasDish.upsert({
      where: { householdId_key: { householdId, key } },
      create: { householdId, key, name },
      update: {},
      select: { id: true },
    });
    dishIds.set(key, dish.id);
  }

  const data = meals.map((meal) =>
    meal.kind === "OUT"
      ? { householdId, date: meal.date, slot: meal.slot, kind: meal.kind, dishId: null, label: meal.label, note: meal.note, status: "VALIDATED" as const, importRef: importRefOf(meal) }
      : {
          householdId,
          date: meal.date,
          slot: meal.slot,
          kind: meal.kind,
          dishId: meal.dishName === null ? null : (dishIds.get(dishKey(meal.dishName)) ?? null),
          label: null,
          note: meal.note,
          status: "VALIDATED" as const,
          importRef: importRefOf(meal),
        },
  );
  const { count } = await db.repasMeal.createMany({ data, skipDuplicates: true });

  // Sides of the meals just created (a slot kept from before keeps its own sides).
  const withSides = meals.filter((meal) => meal.kind !== "OUT" && meal.sides.length > 0);
  if (withSides.length > 0) {
    const created = await db.repasMeal.findMany({
      where: { householdId, importRef: { in: withSides.map(importRefOf) }, sides: { none: {} } },
      select: { id: true, importRef: true },
    });
    const mealIdByRef = new Map(created.map((row) => [row.importRef, row.id]));
    const sideIds = new Map<string, string>();
    const rows: { mealId: string; ingredientId: string; sortOrder: number }[] = [];
    for (const meal of withSides) {
      const mealId = mealIdByRef.get(importRefOf(meal));
      if (!mealId || meal.kind === "OUT") continue;
      for (const [sortOrder, name] of meal.sides.entries()) {
        const key = ingredientKey(name);
        let ingredientId = sideIds.get(key);
        if (!ingredientId) {
          const ingredient = await db.repasIngredient.upsert({
            where: { householdId_key: { householdId, key } },
            create: { householdId, key, name, aisle: guessAisle(name), side: true },
            update: {},
            select: { id: true },
          });
          ingredientId = ingredient.id;
          sideIds.set(key, ingredientId);
        }
        rows.push({ mealId, ingredientId, sortOrder });
      }
    }
    await db.repasMealSide.createMany({ data: rows, skipDuplicates: true });
  }
  return { dishes: catalogue.size, created: count, skipped: data.length - count };
}

/** Normalised names of the side list (to split "dish + sides" at import). */
export async function getSideKeys(householdId: string): Promise<Set<string>> {
  const rows = await db.repasIngredient.findMany({ where: { householdId, side: true }, select: { key: true } });
  return new Set(rows.map((row) => row.key));
}

/** Removes the imported meals (manual ones stay) and the dishes left unused. */
export async function deleteMenuImports(householdId: string): Promise<number> {
  const { count } = await db.repasMeal.deleteMany({ where: { householdId, importRef: { not: null } } });
  await db.repasDish.deleteMany({ where: { householdId, meals: { none: {} } } });
  return count;
}

/**
 * Ingredients guessed from the Excel shopping notes, for dishes that have none
 * yet (a dish already filled in by hand is never touched). Marked "suggested".
 */
export async function applyIngredientSuggestions(
  suggestions: ReadonlyMap<string, readonly SuggestedIngredient[]>,
  householdId: string,
): Promise<number> {
  let filled = 0;
  for (const [key, items] of suggestions) {
    const dish = await db.repasDish.findUnique({ where: { householdId_key: { householdId, key } }, select: { id: true, _count: { select: { ingredients: true } } } });
    if (!dish || dish._count.ingredients > 0 || items.length === 0) continue;
    for (const [index, item] of items.entries()) {
      const ingredient = await db.repasIngredient.upsert({
        where: { householdId_key: { householdId, key: ingredientKey(item.name) } },
        create: {
          householdId,
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
