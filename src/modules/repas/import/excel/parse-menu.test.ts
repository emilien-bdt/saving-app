import { describe, expect, it } from "vitest";
import { toIsoDate } from "../../domain/week";
import {
  type SheetGrid,
  buildDishCatalogue,
  classifyMealCell,
  mergeAndResolve,
  parseMenuSheet,
  splitShoppingCell,
  weekStartFromFileName,
} from "./parse-menu";

function grid(cells: Record<number, Record<string, string>>): SheetGrid {
  return new Map(Object.entries(cells).map(([row, cols]) => [Number(row), new Map(Object.entries(cols))]));
}

describe("classifyMealCell", () => {
  it("recognises absences, undecided and events", () => {
    expect(classifyMealCell("x")).toEqual({ kind: "OUT", label: "Absent", note: null });
    expect(classifyMealCell(" ? ")).toBeNull();
    expect(classifyMealCell("A ")).toBeNull();
    expect(classifyMealCell("Nöel - Mamie Jeanette")).toMatchObject({ kind: "OUT" });
    expect(classifyMealCell("restaurant l'escapade")).toMatchObject({ kind: "OUT" });
    expect(classifyMealCell("chez maman")).toMatchObject({ kind: "OUT", label: "Chez maman" });
  });

  it("reads leftovers and their hint", () => {
    expect(classifyMealCell("reste")).toEqual({ kind: "LEFTOVER", hint: null, note: null });
    expect(classifyMealCell("reste | tadoki - carbo")).toMatchObject({ hint: "tadoki - carbo" });
    expect(classifyMealCell("reste gratin")).toMatchObject({ hint: "gratin" });
    expect(classifyMealCell("reste zoë")).toEqual({ kind: "LEFTOVER", hint: null, note: "Zoë" });
    expect(classifyMealCell("zoe : reste de la veille")).toEqual({ kind: "LEFTOVER", hint: null, note: "Zoë" });
  });

  it("keeps dishes, Zoë notes and unclosed comments", () => {
    expect(classifyMealCell("pates  carbo")).toEqual({ kind: "DISH", dishName: "Pates carbo", note: null });
    expect(classifyMealCell("tortellini (zoë)")).toEqual({ kind: "DISH", dishName: "Tortellini", note: "Zoë" });
    expect(classifyMealCell("petit pois + steak haché (+ lendemain midi")).toEqual({
      kind: "DISH",
      dishName: "Petit pois + steak haché",
      note: "lendemain midi",
    });
  });
});

describe("files", () => {
  it("takes the nearest Monday from the file name", () => {
    expect(toIsoDate(weekStartFromFileName("repas-30-05-26.xlsx") ?? new Date(0))).toBe("2026-06-01");
    expect(weekStartFromFileName("menus.xlsx")).toBeNull();
  });

  it("splits shopping notes", () => {
    expect(splitShoppingCell("chorizo - feta - lait + pain, œufs")).toEqual(["Chorizo", "Feta", "Lait", "Pain", "Œufs"]);
    expect(splitShoppingCell("boisson + poele inox ??")).toEqual(["Boisson", "Poele inox ??"]);
  });

  it("parses a sheet starting on Tuesday", () => {
    const parsed = parseMenuSheet(
      grid({
        3: { E: "Midi", G: "Soir" },
        4: { D: "Mardi", E: "Cordons bleu + patates", G: "lasagnes", K: "cordons bleus" },
        5: { K: "poulet" },
        6: { D: "Mercredi", E: "lasagnes", G: "x" },
        8: { D: "Jeudi" },
      }),
      "repas-20-10-25.xlsx",
    );
    expect(toIsoDate(parsed.weekStart)).toBe("2025-10-20");
    expect(parsed.meals.map((m) => [toIsoDate(m.date), m.slot, m.kind])).toEqual([
      ["2025-10-21", "LUNCH", "DISH"],
      ["2025-10-21", "DINNER", "DISH"],
      ["2025-10-22", "LUNCH", "DISH"],
      ["2025-10-22", "DINNER", "OUT"],
    ]);
    expect(parsed.shopping.map((s) => s.label)).toEqual(["Cordons bleus", "Poulet"]);
  });

  it("resolves leftovers across the grid and builds the catalogue", () => {
    const parsed = parseMenuSheet(
      grid({
        3: { E: "Midi", G: "Soir" },
        4: { D: "Lundi", G: "Gratin dauphinois" },
        6: { D: "Mardi", E: "reste gratin", G: "riz thon mayo" },
        8: { D: "Mercredi", E: "riz thon mayo", G: "Pâtes carbo" },
        10: { D: "Jeudi", E: "reste", G: "pates carbo" },
      }),
      "repas-23-03-26.xlsx",
    );
    const { meals } = mergeAndResolve([parsed]);
    expect(meals.map((m) => [toIsoDate(m.date), m.slot, m.kind, m.kind === "OUT" ? m.label : m.dishName])).toEqual([
      ["2026-03-23", "DINNER", "DISH", "Gratin dauphinois"],
      ["2026-03-24", "LUNCH", "LEFTOVER", "Gratin dauphinois"],
      ["2026-03-24", "DINNER", "DISH", "Riz thon mayo"],
      ["2026-03-25", "LUNCH", "LEFTOVER", "Riz thon mayo"],
      ["2026-03-25", "DINNER", "DISH", "Pâtes carbo"],
      ["2026-03-26", "LUNCH", "LEFTOVER", "Pâtes carbo"],
      ["2026-03-26", "DINNER", "DISH", "Pates carbo"],
    ]);
    const catalogue = buildDishCatalogue(meals);
    expect(catalogue.get("pates carbo")).toBe("Pâtes carbo");
    expect(catalogue.size).toBe(3);
  });

  it("lets a later file override the same slot", () => {
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const rows: Record<number, Record<string, string>> = { 3: { E: "Midi", G: "Soir" } };
    days.forEach((day, i) => (rows[4 + 2 * i] = { D: day }));
    rows[18] = { D: "Lundi", G: "quiche" }; // 01/06, also in the next file
    const first = parseMenuSheet(grid(rows), "repas-25-05-26.xlsx");
    const later = parseMenuSheet(grid({ 3: { E: "Midi", G: "Soir" }, 4: { D: "Lundi", G: "x" } }), "repas-30-05-26.xlsx");
    const { meals } = mergeAndResolve([later, first]);
    expect(meals.map((m) => [toIsoDate(m.date), m.kind])).toEqual([["2026-06-01", "OUT"]]);
  });
});
