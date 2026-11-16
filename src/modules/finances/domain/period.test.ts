import { describe, expect, it } from "vitest";
import { addMonths, calendarDate, clampDay, dateForUnknownDay, lastDayOfMonth, monthRange } from "./period";

const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("period", () => {
  it("knows month lengths, leap years included", () => {
    expect(lastDayOfMonth({ year: 2025, month: 2 })).toBe(28);
    expect(lastDayOfMonth({ year: 2024, month: 2 })).toBe(29);
    expect(lastDayOfMonth({ year: 2026, month: 4 })).toBe(30);
  });

  it("dates rows without a day on the last day of the month", () => {
    expect(iso(dateForUnknownDay({ year: 2025, month: 3 }))).toBe("2025-03-31");
  });

  it("clamps recurring days", () => {
    expect(iso(clampDay({ year: 2026, month: 2 }, 31))).toBe("2026-02-28");
    expect(iso(clampDay({ year: 2026, month: 3 }, 15))).toBe("2026-03-15");
  });

  it("builds half-open month ranges", () => {
    const { start, end } = monthRange({ year: 2026, month: 12 });
    expect([iso(start), iso(end)]).toEqual(["2026-12-01", "2027-01-01"]);
  });

  it("adds months across years", () => {
    expect(addMonths({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("rejects invalid dates", () => {
    expect(() => calendarDate(2026, 2, 30)).toThrow(RangeError);
    expect(() => monthRange({ year: 2026, month: 13 })).toThrow(RangeError);
  });
});
