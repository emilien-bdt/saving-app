import { db } from "@/shared/lib/db";
import { cleanDishName } from "../domain/dish-key";
import { guessAisle, ingredientKey } from "../domain/ingredients";
import type { IngredientInfo, Recipe, ShoppingMeal, ShoppingSource, StoredItem } from "../domain/shopping";
import { addDays } from "../domain/week";
import type { SideOption } from "../view-models";

export type ShoppingData = {
  meals: ShoppingMeal[];
  recipes: Map<string, Recipe>;
  ingredients: Map<string, IngredientInfo>;
  stored: StoredItem[];
};

const ingredientSelect = { id: true, name: true, unit: true, aisle: true, packAmount: true } as const;

/** Everything the list of the week (Monday → Sunday) is computed from. */
export async function getShoppingData(monday: Date): Promise<ShoppingData> {
  const [mealRows, stored] = await Promise.all([
    db.repasMeal.findMany({
      where: { date: { gte: monday, lte: addDays(monday, 6) } },
      select: { date: true, slot: true, kind: true, dishId: true, sides: { select: { ingredientId: true } } },
    }),
    db.repasShoppingItem.findMany({
      where: { weekStart: monday },
      select: { ingredientId: true, source: true, amount: true, checked: true, removed: true },
    }),
  ]);
  const meals = mealRows.map((row) => ({ ...row, sides: row.sides.map((side) => side.ingredientId) }));

  const dishIds = [...new Set(meals.map((meal) => meal.dishId).filter((id): id is string => id !== null))];
  const dishes = await db.repasDish.findMany({
    where: { id: { in: dishIds } },
    select: { id: true, name: true, ingredients: { orderBy: { sortOrder: "asc" }, select: { ingredientId: true, amount: true } } },
  });
  const recipes = new Map(dishes.map((dish) => [dish.id, { name: dish.name, ingredients: dish.ingredients }]));

  const ingredientIds = new Set([
    ...dishes.flatMap((dish) => dish.ingredients.map((item) => item.ingredientId)),
    ...meals.flatMap((meal) => meal.sides),
    ...stored.map((item) => item.ingredientId),
  ]);
  const ingredientRows = await db.repasIngredient.findMany({ where: { id: { in: [...ingredientIds] } }, select: ingredientSelect });
  return { meals, recipes, ingredients: new Map(ingredientRows.map((row) => [row.id, row])), stored };
}

/** Basics, in the order of the drive aisles then by name. */
export async function getStapleOptions(): Promise<SideOption[]> {
  return db.repasIngredient.findMany({ where: { staple: true }, select: { id: true, name: true }, orderBy: [{ aisle: "asc" }, { name: "asc" }] });
}

export async function setStaple(name: string, staple: boolean): Promise<void> {
  const key = ingredientKey(name);
  await db.repasIngredient.upsert({
    where: { key },
    create: { key, name: cleanDishName(name), aisle: guessAisle(name), staple },
    update: { staple },
  });
}

/** Existing ingredient with that name, or a new one (aisle guessed). */
export async function findOrCreateIngredient(name: string): Promise<string> {
  const key = ingredientKey(name);
  const ingredient = await db.repasIngredient.upsert({
    where: { key },
    create: { key, name: cleanDishName(name), aisle: guessAisle(name) },
    update: {},
    select: { id: true },
  });
  return ingredient.id;
}

type ItemChange = Partial<{ amount: number | null; checked: boolean; removed: boolean }>;

/**
 * Records what was done on a line. `source` is used only when the row does
 * not exist yet (first action on a computed line = MEALS).
 */
export async function upsertItem(monday: Date, ingredientId: string, source: ShoppingSource, change: ItemChange): Promise<void> {
  await db.repasShoppingItem.upsert({
    where: { weekStart_ingredientId: { weekStart: monday, ingredientId } },
    create: { weekStart: monday, ingredientId, source, ...change },
    update: change,
  });
}

/** Removes a basic or a manual line (a computed line is only marked "déjà au placard"). */
export async function deleteItem(monday: Date, ingredientId: string): Promise<void> {
  await db.repasShoppingItem.deleteMany({ where: { weekStart: monday, ingredientId, source: { not: "MEALS" } } });
}

/** Unticks everything (new shopping trip with the same list). */
export async function uncheckAll(monday: Date): Promise<void> {
  await db.repasShoppingItem.updateMany({ where: { weekStart: monday }, data: { checked: false } });
}

/** Every known ingredient (autocompletion of the quick add). */
export async function getIngredientNames(): Promise<SideOption[]> {
  return db.repasIngredient.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

/** "Déjà au placard" on a computed line (the row becomes a MEALS row), or back to buy. */
export async function markRemoved(monday: Date, ingredientId: string, removed: boolean): Promise<void> {
  await db.repasShoppingItem.upsert({
    where: { weekStart_ingredientId: { weekStart: monday, ingredientId } },
    create: { weekStart: monday, ingredientId, source: "MEALS", removed },
    update: removed ? { removed, source: "MEALS", checked: false } : { removed },
  });
}
