import { describe, expect, it } from "vitest";
import { type MealCell, buildGrid, fillableSlots, moveMeal } from "./grid";
import { slotKey, utcDate } from "./week";

const monday = utcDate(2026, 11, 23);
const tuesday = utcDate(2026, 11, 24);

function cell(date: Date, slot: MealCell["slot"], dishId: string, status: MealCell["status"] = "PROPOSED"): MealCell {
  return { date, slot, kind: "DISH", dishId, sides: [], label: null, note: null, status };
}

describe("grid", () => {
  it("lays out 7 rows of lunch/dinner", () => {
    const rows = buildGrid(monday, [cell(tuesday, "DINNER", "quiche")]);
    expect(rows).toHaveLength(7);
    expect(rows[1]?.dinner?.dishId).toBe("quiche");
    expect(rows[1]?.lunch).toBeNull();
  });

  it("never offers validated slots to the generator", () => {
    const cells = [cell(monday, "LUNCH", "a", "VALIDATED"), cell(monday, "DINNER", "b")];
    const slots = fillableSlots(monday, cells).map(slotKey);
    expect(slots).toHaveLength(13);
    expect(slots).not.toContain("2026-11-23:LUNCH");
    expect(fillableSlots(monday, cells, { date: monday, slot: "LUNCH" })).toEqual([]);
    expect(fillableSlots(monday, cells, { date: monday, slot: "DINNER" })).toHaveLength(1);
  });

  it("moves onto an empty slot and swaps onto a filled one", () => {
    const cells = [cell(monday, "DINNER", "a", "VALIDATED"), cell(tuesday, "DINNER", "b")];
    const moved = moveMeal(cells, { date: monday, slot: "DINNER" }, { date: tuesday, slot: "LUNCH" });
    expect(moved.map((c) => [slotKey(c.ref), c.cell?.dishId ?? null, c.cell?.status ?? null])).toEqual([
      ["2026-11-24:LUNCH", "a", "VALIDATED"],
      ["2026-11-23:DINNER", null, null],
    ]);
    const swapped = moveMeal(cells, { date: monday, slot: "DINNER" }, { date: tuesday, slot: "DINNER" });
    expect(swapped.map((c) => c.cell?.dishId)).toEqual(["a", "b"]);
    expect(moveMeal(cells, { date: tuesday, slot: "LUNCH" }, { date: monday, slot: "LUNCH" })).toEqual([]);
  });
});
