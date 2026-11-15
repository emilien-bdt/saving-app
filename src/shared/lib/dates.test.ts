import { describe, expect, it } from "vitest";
import { formatDate, formatMonth, parseDisplayDate } from "./dates";

describe("dates", () => {
  it("formats as JJ/MM/AAAA", () => {
    expect(formatDate(new Date(2026, 9, 5))).toBe("05/10/2026");
  });

  it("formats month labels in French", () => {
    expect(formatMonth(new Date(2026, 9, 1))).toBe("octobre 2026");
  });

  it("parses valid dates and rejects invalid ones", () => {
    expect(parseDisplayDate("05/10/2026")).toEqual(new Date(2026, 9, 5));
    expect(parseDisplayDate("31/02/2026")).toBeNull();
    expect(parseDisplayDate("2026-10-05")).toBeNull();
  });
});
