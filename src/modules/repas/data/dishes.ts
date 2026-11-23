import { db } from "@/shared/lib/db";
import { cleanDishName, dishKey } from "../domain/dish-key";
import { type Aisle, findLikelyDuplicates, ingredientKey, type Unit } from "../domain/ingredients";
import { toIsoDate } from "../domain/week";
import type { DishItem, DishOption, IngredientOption } from "../view-models";

/** Existing dish with the same normalised name, or a new one. */
export async function findOrCreateDish(name: string): Promise<string> {
  const key = dishKey(name);
  const dish = await db.repasDish.upsert({
    where: { key },
    create: { key, name: cleanDishName(name) },
    update: { archived: false },
    select: { id: true },
  });
  return dish.id;
}

/** Active dishes, most eaten first (suggestions and generator candidates). */
export async function getDishOptions(): Promise<DishOption[]> {
  const rows = await db.repasDish.findMany({
    where: { archived: false },
    select: { id: true, name: true, _count: { select: { meals: { where: { kind: "DISH" } } } } },
  });
  return rows
    .map((row) => ({ id: row.id, name: row.name, count: row._count.meals }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
}

/** Every dish (archived included) with its use and its ingredients, most cooked first. */
export async function getDishItems(): Promise<DishItem[]> {
  const [dishes, cooked, used] = await Promise.all([
    db.repasDish.findMany({
      select: {
        id: true,
        name: true,
        archived: true,
        ingredients: {
          orderBy: { sortOrder: "asc" },
          select: { amount: true, suggested: true, ingredient: { select: { id: true, name: true, unit: true, aisle: true } } },
        },
      },
    }),
    db.repasMeal.groupBy({ by: ["dishId"], where: { kind: "DISH" }, _count: { _all: true } }),
    db.repasMeal.groupBy({ by: ["dishId"], where: { dishId: { not: null } }, _count: { _all: true }, _max: { date: true } }),
  ]);
  const cookedById = new Map(cooked.map((row) => [row.dishId, row._count._all]));
  const usedById = new Map(used.map((row) => [row.dishId, row]));

  const items = dishes.map((dish) => {
    const use = usedById.get(dish.id);
    return {
      id: dish.id,
      name: dish.name,
      archived: dish.archived,
      cooked: cookedById.get(dish.id) ?? 0,
      meals: use?._count._all ?? 0,
      lastIso: use?._max.date ? toIsoDate(use._max.date) : null,
      ingredients: dish.ingredients.map((row) => ({
        ingredientId: row.ingredient.id,
        name: row.ingredient.name,
        amount: row.amount,
        unit: row.ingredient.unit,
        aisle: row.ingredient.aisle,
        suggested: row.suggested,
      })),
    };
  });
  const duplicates = findLikelyDuplicates(items.filter((item) => !item.archived).map((item) => ({ ...item, count: item.cooked })));
  return items
    .map((item) => {
      const twin = duplicates.get(item.id);
      return { ...item, duplicateOf: twin ? { id: twin.id, name: twin.name } : null };
    })
    .sort((a, b) => b.cooked - a.cooked || a.name.localeCompare(b.name, "fr"));
}

export async function getIngredientOptions(): Promise<IngredientOption[]> {
  const rows = await db.repasIngredient.findMany({
    select: { id: true, name: true, unit: true, aisle: true, packAmount: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export type DishIngredientData = { name: string; amount: number | null; unit: Unit; aisle: Aisle };
export type SaveDishData = { name: string; archived: boolean; ingredients: readonly DishIngredientData[] };

/**
 * Saves a dish and its ingredients (reviewed: no longer "suggested"). The unit
 * and aisle belong to the ingredient, so they change for every dish using it.
 */
export async function saveDish(
  id: string,
  data: SaveDishData,
): Promise<{ ok: true } | { ok: false; reason: "missing" } | { ok: false; reason: "name_taken"; other: string }> {
  const key = dishKey(data.name);
  const other = await db.repasDish.findFirst({ where: { key, id: { not: id } }, select: { name: true } });
  if (other) return { ok: false, reason: "name_taken", other: other.name };

  return db.$transaction(async (tx) => {
    const { count } = await tx.repasDish.updateMany({ where: { id }, data: { name: cleanDishName(data.name), key, archived: data.archived } });
    if (count === 0) return { ok: false as const, reason: "missing" as const };
    await tx.repasDishIngredient.deleteMany({ where: { dishId: id } });
    for (const [index, item] of data.ingredients.entries()) {
      const ingredient = await tx.repasIngredient.upsert({
        where: { key: ingredientKey(item.name) },
        create: { key: ingredientKey(item.name), name: cleanDishName(item.name), unit: item.unit, aisle: item.aisle },
        update: { unit: item.unit, aisle: item.aisle },
        select: { id: true },
      });
      await tx.repasDishIngredient.create({
        data: { dishId: id, ingredientId: ingredient.id, amount: item.amount, sortOrder: index, suggested: false },
      });
    }
    return { ok: true as const };
  });
}

/** Moves every meal and the missing ingredients of `sourceId` to `targetId`, then deletes the source. */
export async function mergeDishes(sourceId: string, targetId: string): Promise<boolean> {
  if (sourceId === targetId) return false;
  return db.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.repasDish.findUnique({ where: { id: sourceId }, select: { id: true } }),
      tx.repasDish.findUnique({ where: { id: targetId }, select: { ingredients: { select: { ingredientId: true } } } }),
    ]);
    if (!source || !target) return false;
    await tx.repasMeal.updateMany({ where: { dishId: sourceId }, data: { dishId: targetId } });
    await tx.repasDishIngredient.updateMany({
      where: { dishId: sourceId, ingredientId: { notIn: target.ingredients.map((row) => row.ingredientId) } },
      data: { dishId: targetId },
    });
    await tx.repasDish.delete({ where: { id: sourceId } });
    return true;
  });
}

/** Only a dish never eaten can be deleted (otherwise: archive it). */
export async function deleteUnusedDish(id: string): Promise<boolean> {
  const { count } = await db.repasDish.deleteMany({ where: { id, meals: { none: {} } } });
  return count > 0;
}
