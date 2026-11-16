import { describe, expect, it } from "vitest";
import { addDaysIso, todayIso } from "./today";

describe("todayIso", () => {
  it("uses the Paris calendar day, not the UTC one", () => {
    expect(todayIso(new Date("2026-11-30T23:30:00Z"))).toBe("2026-12-01");
    expect(todayIso(new Date("2026-07-15T21:59:00Z"))).toBe("2026-07-15");
    expect(todayIso(new Date("2026-07-15T22:01:00Z"))).toBe("2026-07-16");
  });
});

describe("addDaysIso", () => {
  it("crosses months and years", () => {
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysIso("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
  });
});
