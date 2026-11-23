import { describe, expect, it } from "vitest";
import { habitualSides, splitMealName } from "./sides";

describe("sides", () => {
  it("separates the dish from its sides", () => {
    expect(splitMealName("Croques monsieurs + chips + légumes")).toEqual({ dishName: "Croques monsieurs", sides: ["Chips", "Légumes"] });
    expect(splitMealName("Pates carbo + salade")).toEqual({ dishName: "Pates carbo", sides: ["Salade"] });
    expect(splitMealName("Concombre + feta")).toEqual({ dishName: null, sides: ["Concombre", "Feta"] });
    expect(splitMealName("Concombre + gratin de courgette")).toEqual({ dishName: "Gratin de courgette", sides: ["Concombre"] });
    expect(splitMealName("Poulet + patates")).toEqual({ dishName: "Poulet + patates", sides: [] });
    expect(splitMealName("Semoule, ratatouille, merguez")).toEqual({ dishName: "Semoule, ratatouille, merguez", sides: [] });
    expect(splitMealName("Salade de lentilles")).toEqual({ dishName: "Salade de lentilles", sides: [] });
    expect(splitMealName("Cordons bleus + salade & reste lasagnes")).toEqual({ dishName: "Cordons bleus + reste lasagnes", sides: ["Salade"] });
    expect(splitMealName("Salade de pates (feta + tomates) + chips")).toEqual({ dishName: "Salade de pates (feta + tomates)", sides: ["Chips"] });
    expect(splitMealName("Salade + salades")).toEqual({ dishName: null, sides: ["Salade"] });
  });

  it("finds the sides usually eaten with a dish", () => {
    const history = [
      { kind: "DISH", dishId: "croques", sides: ["chips"] },
      { kind: "DISH", dishId: "croques", sides: ["chips", "salade"] },
      { kind: "DISH", dishId: "croques", sides: [] },
      { kind: "LEFTOVER", dishId: "croques", sides: ["salade"] },
      { kind: "DISH", dishId: "quiche", sides: [] },
    ];
    const usual = habitualSides(history);
    expect(usual.get("croques")).toEqual(["chips"]);
    expect(usual.has("quiche")).toBe(false);
  });
});
