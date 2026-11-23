import { db } from "@/shared/lib/db";
import { cleanDishName, dishKey } from "../domain/dish-key";
import type { DishOption } from "../view-models";

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
