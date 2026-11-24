// The week's shopping list. Three sources merged per ingredient:
// - MEALS: computed from the week's meals. A cooked dish counts for 1 meal
//   plus 1 per planned leftover of it (its ingredients are for one meal for 2);
//   a side item counts once per meal it is served with;
// - STAPLE: basics added in one tap when they run out;
// - MANUAL: typed by hand.
// What the user did on a line (ticked, quantity changed, "déjà au placard")
// is stored per week and ingredient and applied on top of the computation.

import { AISLES, type Aisle, formatQuantity, type Unit } from "./ingredients";
import type { MealKind } from "./grid";
import type { MealSlot } from "./week";

export type ShoppingSource = "MEALS" | "STAPLE" | "MANUAL";

export type ShoppingMeal = { date: Date; slot: MealSlot; kind: MealKind; dishId: string | null; sides: readonly string[] };
export type Recipe = { name: string; ingredients: readonly { ingredientId: string; amount: number | null }[] };
export type IngredientInfo = { id: string; name: string; unit: Unit; aisle: Aisle; packAmount: number | null };
export type StoredItem = { ingredientId: string; source: ShoppingSource; amount: number | null; checked: boolean; removed: boolean };

export type ShoppingLine = {
  ingredientId: string;
  name: string;
  aisle: Aisle;
  unit: Unit;
  /** Quantity to buy in `unit`; null = unknown (fill it in Plats, or here). */
  amount: number | null;
  /** Changed by hand on this list. */
  overridden: boolean;
  /** Bought by packs: 400 g of 200 g packs → { count: 2, size: 200 }. */
  packs: { count: number; size: number } | null;
  /** Number of meals a side item is served with. */
  sideMeals: number;
  /** "Quiche lorraine ×2 repas", "Basique"… */
  reasons: string[];
  source: ShoppingSource;
  checked: boolean;
  /** "Déjà au placard": computed but not to buy. */
  removed: boolean;
};

/** Meals covered by each dish cooked this week: the cooking + its leftovers planned after it. */
export function mealsPerDish(meals: readonly ShoppingMeal[]): Map<string, number> {
  const ordered = [...meals].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.slot === "LUNCH" ? -1 : 1) - (b.slot === "LUNCH" ? -1 : 1));
  const covered = new Map<string, number>();
  for (const meal of ordered) {
    if (!meal.dishId) continue;
    if (meal.kind === "DISH") covered.set(meal.dishId, (covered.get(meal.dishId) ?? 0) + 1);
    // A leftover counts only when the dish is cooked earlier this week (not last week's).
    else if (meal.kind === "LEFTOVER" && covered.has(meal.dishId)) covered.set(meal.dishId, (covered.get(meal.dishId) ?? 0) + 1);
  }
  return covered;
}

export function buildShoppingList(
  meals: readonly ShoppingMeal[],
  recipes: ReadonlyMap<string, Recipe>,
  ingredients: ReadonlyMap<string, IngredientInfo>,
  stored: readonly StoredItem[],
): ShoppingLine[] {
  type Acc = { amount: number; unknown: boolean; sideMeals: number; reasons: string[] };
  const computed = new Map<string, Acc>();
  const acc = (id: string): Acc => {
    const existing = computed.get(id);
    if (existing) return existing;
    const created: Acc = { amount: 0, unknown: false, sideMeals: 0, reasons: [] };
    computed.set(id, created);
    return created;
  };

  for (const [dishId, count] of mealsPerDish(meals)) {
    const recipe = recipes.get(dishId);
    if (!recipe) continue;
    for (const item of recipe.ingredients) {
      const line = acc(item.ingredientId);
      if (item.amount === null) line.unknown = true;
      else line.amount += item.amount * count;
      line.reasons.push(count > 1 ? `${recipe.name} ×${count} repas` : recipe.name);
    }
  }

  const sideMeals = new Map<string, number>();
  for (const meal of meals) {
    if (meal.kind === "OUT") continue;
    for (const side of new Set(meal.sides)) sideMeals.set(side, (sideMeals.get(side) ?? 0) + 1);
  }
  for (const [id, count] of sideMeals) {
    const line = acc(id);
    line.sideMeals += count;
    line.reasons.push(`accompagnement · ${count} repas`);
  }

  const storedById = new Map(stored.map((item) => [item.ingredientId, item]));
  const lines: ShoppingLine[] = [];
  const push = (id: string, base: { amount: number | null; sideMeals: number; reasons: string[]; source: ShoppingSource }) => {
    const info = ingredients.get(id);
    if (!info) return;
    const item = storedById.get(id);
    const amount = item?.amount ?? base.amount;
    lines.push({
      ingredientId: id,
      name: info.name,
      aisle: info.aisle,
      unit: info.unit,
      amount,
      overridden: item?.amount !== null && item?.amount !== undefined,
      packs: amount !== null && info.packAmount ? { count: Math.ceil(amount / info.packAmount), size: info.packAmount } : null,
      sideMeals: base.sideMeals,
      reasons: base.reasons,
      source: base.source,
      checked: item?.checked ?? false,
      removed: item?.removed ?? false,
    });
  };

  for (const [id, line] of computed) {
    const amount = line.unknown || line.amount === 0 ? null : line.amount;
    const item = storedById.get(id);
    const extra = item && item.source !== "MEALS" ? [item.source === "STAPLE" ? "Basique" : "Ajouté à la main"] : [];
    push(id, { amount, sideMeals: line.sideMeals, reasons: [...line.reasons, ...extra], source: "MEALS" });
  }
  for (const item of stored) {
    // A MEALS row whose meals are gone is stale: nothing to buy any more.
    if (computed.has(item.ingredientId) || item.source === "MEALS") continue;
    push(item.ingredientId, { amount: null, sideMeals: 0, reasons: [item.source === "STAPLE" ? "Basique" : "Ajouté à la main"], source: item.source });
  }

  const aisleOrder = new Map(AISLES.map((aisle, index) => [aisle.id, index]));
  return lines.sort(
    (a, b) =>
      (aisleOrder.get(a.aisle) ?? 99) - (aisleOrder.get(b.aisle) ?? 99) ||
      Number(a.checked) - Number(b.checked) ||
      a.name.localeCompare(b.name, "fr"),
  );
}

/** "400 g (2 × 200 g)", "×3", "3 repas", "" */
export function lineQuantity(line: Pick<ShoppingLine, "amount" | "unit" | "packs" | "sideMeals">): string {
  if (line.amount !== null) {
    const quantity = formatQuantity(line.amount, line.unit);
    return line.packs && line.packs.size !== line.amount ? `${quantity} (${line.packs.count} × ${formatQuantity(line.packs.size, line.unit).replace("×", "")})` : quantity;
  }
  return line.sideMeals > 0 ? `${line.sideMeals} repas` : "";
}

/** Plain text of what is left to buy, by aisle (copy / share). */
export function shoppingText(lines: readonly ShoppingLine[], title: string): string {
  const toBuy = lines.filter((line) => !line.checked && !line.removed);
  const parts = [title];
  for (const aisle of AISLES) {
    const inAisle = toBuy.filter((line) => line.aisle === aisle.id);
    if (inAisle.length === 0) continue;
    parts.push("", aisle.label.toUpperCase(), ...inAisle.map((line) => `- ${line.name}${lineQuantity(line) ? ` : ${lineQuantity(line)}` : ""}`));
  }
  return parts.join("\n");
}

/** Search page of the Courses U drive for an item (checked: /recherche?q=…). */
export function coursesUSearchUrl(name: string): string {
  return `https://www.coursesu.com/recherche?q=${encodeURIComponent(name)}`;
}
