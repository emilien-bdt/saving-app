import { describe, expect, it } from "vitest";
import { normalizeLabel } from "./labels";

describe("normalizeLabel", () => {
  it.each([
    ["Carrefour - Herouville", "carrefour herouville"],
    ["  Carrefour   -  Hérouville ", "carrefour herouville"],
    ["Uber Eats", "uber eats"],
    ["Mc Donald's", "mc donald s"],
    ["Boulangerie", "boulangerie"],
  ])("%j → %j", (input, expected) => {
    expect(normalizeLabel(input)).toBe(expected);
  });
});
