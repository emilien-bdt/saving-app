import { describe, expect, it } from "vitest";
import { suggestDishIngredients } from "./ingredient-suggestions";
import { findLikelyDuplicates, formatQuantity, guessAisle, ingredientKey, parseIngredient } from "./ingredients";
import { utcDate } from "./week";

describe("ingredients", () => {
  it("normalises names and plurals", () => {
    expect(ingredientKey("Œufs")).toBe(ingredientKey("oeuf"));
    expect(ingredientKey("Poireaux")).toBe("poireau");
    expect(ingredientKey("Pâtes")).toBe(ingredientKey("pate"));
    expect(ingredientKey("Riz")).toBe("riz");
  });

  it("parses quantities", () => {
    expect(parseIngredient("lardons x2")).toEqual({ name: "Lardons", quantity: { amount: 2, unit: "PIECE" } });
    expect(parseIngredient("gruyère 200g")).toEqual({ name: "Gruyère", quantity: { amount: 200, unit: "G" } });
    expect(parseIngredient("3 poireaux")).toEqual({ name: "Poireaux", quantity: { amount: 3, unit: "PIECE" } });
    expect(parseIngredient("crème 20cl")).toEqual({ name: "Crème", quantity: { amount: 200, unit: "ML" } });
    expect(parseIngredient("viande 2 morceau")).toEqual({ name: "Viande", quantity: { amount: 2, unit: "PIECE" } });
    expect(parseIngredient("1 morceau de viande")).toEqual({ name: "Viande", quantity: { amount: 1, unit: "PIECE" } });
    expect(parseIngredient("Steak x3")).toEqual({ name: "Steak", quantity: { amount: 3, unit: "PIECE" } });
    expect(parseIngredient("pâtes rondes")).toEqual({ name: "Pâtes rondes", quantity: null });
    expect(parseIngredient("légumes ?")).toEqual({ name: "Légumes", quantity: null });
  });

  it("formats quantities", () => {
    expect(formatQuantity(400, "G")).toBe("400 g");
    expect(formatQuantity(1500, "G")).toBe("1,5 kg");
    expect(formatQuantity(200, "ML")).toBe("20 cl");
    expect(formatQuantity(3, "PIECE")).toBe("×3");
    expect(formatQuantity(null, "G")).toBe("");
  });

  it("guesses the drive aisle", () => {
    expect(guessAisle("Lardons")).toBe("CHARCUTERIE_TRAITEUR");
    expect(guessAisle("Pain de mie")).toBe("BOULANGERIE");
    expect(guessAisle("Pâte brisée")).toBe("CHARCUTERIE_TRAITEUR");
    expect(guessAisle("Pâtes")).toBe("EPICERIE_SALEE");
    expect(guessAisle("Sauce tomates")).toBe("EPICERIE_SALEE");
    expect(guessAisle("Tomates")).toBe("FRUITS_LEGUMES");
    expect(guessAisle("Pommes de terre")).toBe("FRUITS_LEGUMES");
    expect(guessAisle("Bœuf haché")).toBe("BOUCHERIE_POISSON");
    expect(guessAisle("Saucisse fumée")).toBe("CHARCUTERIE_TRAITEUR");
    expect(guessAisle("Crème liquide")).toBe("CREMERIE");
    expect(guessAisle("Panaché")).toBe("BOISSONS");
    expect(guessAisle("Nutella")).toBe("EPICERIE_SUCREE");
    expect(guessAisle("Poêle inox")).toBe("AUTRE");
  });

  it("spots likely duplicate dishes", () => {
    const dishes = [
      { id: "a", name: "Pates carbo", count: 6 },
      { id: "b", name: "Pates carbo + salade", count: 1 },
      { id: "c", name: "Poulet patate", count: 3 },
      { id: "d", name: "Poulet + patates", count: 1 },
      { id: "e", name: "Quiche lorraine", count: 4 },
    ];
    const duplicates = findLikelyDuplicates(dishes);
    expect(duplicates.get("b")?.id).toBe("a");
    expect(duplicates.get("d")?.id).toBe("c");
    expect(duplicates.has("a")).toBe(false);
    expect(duplicates.has("e")).toBe(false);
  });

  it("suggests a dish's ingredients from the shopping of the day it was cooked", () => {
    const tuesday = utcDate(2026, 3, 24);
    const wednesday = utcDate(2026, 3, 25);
    const suggestions = suggestDishIngredients(
      [
        { date: tuesday, slot: "LUNCH", kind: "DISH", dishName: "Gratin" },
        { date: tuesday, slot: "DINNER", kind: "DISH", dishName: "Quiche lorraine" },
        { date: wednesday, slot: "LUNCH", kind: "LEFTOVER", dishName: "Quiche lorraine" },
        { date: utcDate(2026, 4, 7), slot: "DINNER", kind: "DISH", dishName: "quiche  lorraine" },
      ],
      [
        { date: tuesday, label: "Lardons x2" },
        { date: tuesday, label: "Œufs" },
        { date: wednesday, label: "Panaché" },
        { date: utcDate(2026, 4, 7), label: "lardons" },
      ],
    );
    expect(suggestions.get("quiche lorraine")).toEqual([
      { name: "Lardons", quantity: { amount: 2, unit: "PIECE" }, seen: 2 },
      { name: "Œufs", quantity: null, seen: 1 },
    ]);
    expect(suggestions.has("gratin")).toBe(false);
  });
});
