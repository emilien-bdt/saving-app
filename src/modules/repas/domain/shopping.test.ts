import { describe, expect, it } from "vitest";
import type { IngredientInfo, Recipe, ShoppingMeal } from "./shopping";
import { buildShoppingList, coursesUSearchUrl, lineQuantity, mealsPerDish, shoppingText } from "./shopping";
import { utcDate } from "./week";

const mon = utcDate(2026, 11, 23);
const tue = utcDate(2026, 11, 24);
const wed = utcDate(2026, 11, 25);

const ingredients = new Map<string, IngredientInfo>([
  ["lardons", { id: "lardons", name: "Lardons", unit: "G", aisle: "CHARCUTERIE_TRAITEUR", packAmount: 200 }],
  ["oeufs", { id: "oeufs", name: "Œufs", unit: "PIECE", aisle: "CREMERIE", packAmount: 6 }],
  ["creme", { id: "creme", name: "Crème", unit: "ML", aisle: "CREMERIE", packAmount: null }],
  ["chips", { id: "chips", name: "Chips", unit: "PIECE", aisle: "EPICERIE_SALEE", packAmount: null }],
  ["lait", { id: "lait", name: "Lait", unit: "ML", aisle: "CREMERIE", packAmount: 1000 }],
  ["pates", { id: "pates", name: "Pâtes", unit: "G", aisle: "EPICERIE_SALEE", packAmount: 500 }],
]);
const recipes = new Map<string, Recipe>([
  ["quiche", { name: "Quiche lorraine", ingredients: [{ ingredientId: "lardons", amount: 200 }, { ingredientId: "oeufs", amount: 3 }, { ingredientId: "creme", amount: null }] }],
  ["carbo", { name: "Pâtes carbo", ingredients: [{ ingredientId: "lardons", amount: 150 }, { ingredientId: "pates", amount: 250 }] }],
]);

function meal(date: Date, slot: ShoppingMeal["slot"], kind: ShoppingMeal["kind"], dishId: string | null, sides: string[] = []): ShoppingMeal {
  return { date, slot, kind, dishId, sides };
}

describe("shopping list", () => {
  it("counts a dish once plus once per leftover planned after it", () => {
    const covered = mealsPerDish([
      meal(mon, "LUNCH", "LEFTOVER", "carbo"), // last week's carbo: not bought again
      meal(mon, "DINNER", "DISH", "quiche"),
      meal(tue, "LUNCH", "LEFTOVER", "quiche"),
      meal(tue, "DINNER", "DISH", "carbo"),
    ]);
    expect(covered).toEqual(new Map([["quiche", 2], ["carbo", 1]]));
  });

  it("adds up quantities across dishes, rounds to packs and counts sides per meal", () => {
    const lines = buildShoppingList(
      [
        meal(mon, "DINNER", "DISH", "quiche", ["chips"]),
        meal(tue, "LUNCH", "LEFTOVER", "quiche"),
        meal(tue, "DINNER", "DISH", "carbo", ["chips"]),
        meal(wed, "LUNCH", "DISH", null, ["chips"]),
      ],
      recipes,
      ingredients,
      [],
    );
    const byId = new Map(lines.map((line) => [line.ingredientId, line]));
    expect(byId.get("lardons")).toMatchObject({ amount: 550, packs: { count: 3, size: 200 }, reasons: ["Quiche lorraine ×2 repas", "Pâtes carbo"] });
    expect(byId.get("oeufs")).toMatchObject({ amount: 6, packs: { count: 1, size: 6 } });
    expect(byId.get("creme")).toMatchObject({ amount: null });
    expect(byId.get("chips")).toMatchObject({ amount: null, sideMeals: 3 });
    expect(lineQuantity(byId.get("lardons") as never)).toBe("550 g (3 × 200 g)");
    expect(lineQuantity(byId.get("chips") as never)).toBe("3 repas");
    // Drive aisle order: charcuterie, crèmerie, épicerie salée.
    expect(lines.map((line) => line.ingredientId)).toEqual(["lardons", "creme", "oeufs", "chips", "pates"]);
  });

  it("applies what was done on the list and keeps staples and manual items", () => {
    const lines = buildShoppingList(
      [meal(mon, "DINNER", "DISH", "carbo")],
      recipes,
      ingredients,
      [
        { ingredientId: "lardons", source: "MEALS", amount: 200, checked: true, removed: false },
        { ingredientId: "pates", source: "MEALS", amount: null, checked: false, removed: true },
        { ingredientId: "lait", source: "STAPLE", amount: null, checked: false, removed: false },
        { ingredientId: "oeufs", source: "MEALS", amount: null, checked: false, removed: false }, // stale
        { ingredientId: "chips", source: "MANUAL", amount: 2, checked: false, removed: false },
      ],
    );
    const byId = new Map(lines.map((line) => [line.ingredientId, line]));
    expect(byId.get("lardons")).toMatchObject({ amount: 200, overridden: true, checked: true });
    expect(byId.get("pates")).toMatchObject({ removed: true });
    expect(byId.get("lait")).toMatchObject({ source: "STAPLE", reasons: ["Basique"], amount: null });
    expect(byId.get("chips")).toMatchObject({ source: "MANUAL", amount: 2 });
    expect(byId.has("oeufs")).toBe(false);
    expect(shoppingText(lines, "Courses")).toBe("Courses\n\nCRÈMERIE, ŒUFS, FROMAGES\n- Lait\n\nÉPICERIE SALÉE\n- Chips : ×2");
  });

  it("links an item to the Courses U search", () => {
    expect(coursesUSearchUrl("Pain de mie")).toBe("https://www.coursesu.com/recherche?q=Pain%20de%20mie");
  });
});

