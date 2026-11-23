import { describe, expect, it } from "vitest";
import { type CandidateDish, type HistoryMeal, generateMenu, observedLeftoverRate, seededRandom } from "./generator";
import type { MealCell } from "./grid";
import { addDays, slotKey, utcDate, weekSlots } from "./week";

const monday = utcDate(2026, 11, 23);
const dishes: CandidateDish[] = [
  { id: "carbo", name: "Pates carbo" },
  { id: "pesto", name: "Pates au pesto" },
  { id: "quiche", name: "Quiche lorraine" },
  { id: "gratin", name: "Gratin dauphinois" },
  { id: "riz", name: "Riz thon mayo" },
  { id: "poulet", name: "Poulet patates" },
  { id: "raclette", name: "Raclette" },
  { id: "salade", name: "Salade composée" },
];

function meal(date: Date, slot: HistoryMeal["slot"], kind: HistoryMeal["kind"], dishId: string | null): HistoryMeal {
  return { date, slot, kind, dishId };
}

describe("generator", () => {
  it("is deterministic for a seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("measures how often lunch is the previous dinner's leftover", () => {
    const d = utcDate(2026, 1, 5);
    const history = [
      meal(d, "DINNER", "DISH", "carbo"),
      meal(addDays(d, 1), "LUNCH", "LEFTOVER", "carbo"),
      meal(addDays(d, 1), "DINNER", "DISH", "quiche"),
      meal(addDays(d, 2), "LUNCH", "DISH", "riz"),
    ];
    expect(observedLeftoverRate(history)).toBe(0.5);
  });

  it("fills only the requested slots, without repeating a dish in the week", () => {
    const fixed: MealCell[] = [
      { date: monday, slot: "DINNER", kind: "DISH", dishId: "quiche", label: null, note: null, status: "VALIDATED" },
    ];
    const slots = weekSlots(monday).filter((s) => slotKey(s) !== slotKey(fixed[0] as MealCell));
    const proposals = generateMenu({ monday, slots, fixed, history: [], dishes, seed: 7, leftoverRate: 0 });
    expect(proposals).toHaveLength(7); // 13 slots but only 7 dishes left once quiche is used
    const ids = proposals.map((p) => p.dishId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("quiche");
  });

  it("turns the lunch after a cooked dinner into its leftover", () => {
    const fixed: MealCell[] = [
      { date: monday, slot: "DINNER", kind: "DISH", dishId: "gratin", label: null, note: null, status: "VALIDATED" },
    ];
    const tuesday = addDays(monday, 1);
    const proposals = generateMenu({
      monday,
      slots: [{ date: tuesday, slot: "LUNCH" }, { date: tuesday, slot: "DINNER" }, { date: addDays(monday, 2), slot: "LUNCH" }],
      fixed,
      history: [],
      dishes,
      seed: 1,
      leftoverRate: 1,
    });
    expect(proposals[0]).toMatchObject({ kind: "LEFTOVER", dishId: "gratin" });
    expect(proposals[1]?.kind).toBe("DISH");
    expect(proposals[2]).toMatchObject({ kind: "LEFTOVER", dishId: proposals[1]?.dishId });
  });

  it("favours dishes eaten in the same season and not too recently", () => {
    const history: HistoryMeal[] = [];
    // Raclette: often in winter, long ago. Salade: often in summer. Riz: last week.
    for (let i = 0; i < 6; i++) history.push(meal(utcDate(2025, 12, 1 + i * 3), "DINNER", "DISH", "raclette"));
    for (let i = 0; i < 6; i++) history.push(meal(utcDate(2026, 6, 1 + i * 3), "DINNER", "DISH", "salade"));
    for (let i = 0; i < 6; i++) history.push(meal(addDays(monday, -7 + i), "DINNER", "DISH", "riz"));
    const counts = new Map<string, number>();
    for (let seed = 0; seed < 300; seed++) {
      const [first] = generateMenu({ monday, slots: [{ date: monday, slot: "DINNER" }], fixed: [], history, dishes, seed });
      if (first) counts.set(first.dishId, (counts.get(first.dishId) ?? 0) + 1);
    }
    expect(counts.get("raclette") ?? 0).toBeGreaterThan(counts.get("salade") ?? 0);
    expect(counts.get("raclette") ?? 0).toBeGreaterThan(counts.get("riz") ?? 0);
  });
});
