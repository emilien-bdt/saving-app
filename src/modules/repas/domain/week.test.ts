import { describe, expect, it } from "vitest";
import {
  formatWeekParam,
  isoWeekOf,
  mondayOf,
  nearestMonday,
  parseWeekParam,
  previousSlot,
  toIsoDate,
  utcDate,
  weekSlots,
} from "./week";

describe("weeks", () => {
  it("finds the Monday of a date", () => {
    expect(toIsoDate(mondayOf(utcDate(2026, 11, 23)))).toBe("2026-11-23");
    expect(toIsoDate(mondayOf(utcDate(2026, 11, 29)))).toBe("2026-11-23");
  });

  it("rounds Friday–Sunday up to the next Monday", () => {
    expect(toIsoDate(nearestMonday(utcDate(2026, 5, 30)))).toBe("2026-06-01");
    expect(toIsoDate(nearestMonday(utcDate(2026, 7, 21)))).toBe("2026-07-20");
  });

  it("formats and parses ISO weeks", () => {
    expect(formatWeekParam(utcDate(2026, 11, 23))).toBe("2026-W48");
    expect(toIsoDate(parseWeekParam("2026-W48") ?? utcDate(1970, 1, 1))).toBe("2026-11-23");
    expect(isoWeekOf(utcDate(2026, 12, 31))).toEqual({ year: 2026, week: 53 });
    expect(formatWeekParam(utcDate(2027, 1, 4))).toBe("2027-W01");
    expect(parseWeekParam("2025-W53")).toBeNull();
    expect(parseWeekParam("2026-48")).toBeNull();
  });

  it("orders slots and finds the previous meal", () => {
    const slots = weekSlots(utcDate(2026, 11, 23));
    expect(slots).toHaveLength(14);
    expect(previousSlot({ date: utcDate(2026, 11, 23), slot: "LUNCH" })).toEqual({
      date: utcDate(2026, 11, 22),
      slot: "DINNER",
    });
  });
});
