import { describe, expect, it } from "vitest";
import { parseTransactionFilters, parseView } from "./list-filters";
import { formatMonthParam, parseMonthParam } from "./month-param";

describe("parseMonthParam", () => {
  it("reads ?mois=AAAA-MM", () => {
    expect(parseMonthParam("2025-03", "2026-11-16")).toEqual({ year: 2025, month: 3 });
    expect(parseMonthParam(["2024-12", "x"], "2026-11-16")).toEqual({ year: 2024, month: 12 });
  });

  it.each([undefined, "", "2025-13", "2025-3", "abc", "1899-01"])("falls back to the current month for %j", (value) => {
    expect(parseMonthParam(value, "2026-11-16")).toEqual({ year: 2026, month: 11 });
  });

  it("formats", () => {
    expect(formatMonthParam({ year: 2026, month: 2 })).toBe("2026-02");
  });
});

describe("parseTransactionFilters / parseView", () => {
  it("reads valid filters and drops the others", () => {
    expect(parseTransactionFilters({ compte: "cm1abc", categorie: "bad id!", statut: "prevue", q: "  boulangerie " })).toEqual({
      accountId: "cm1abc",
      categoryId: null,
      status: "PLANNED",
      query: "boulangerie",
    });
    expect(parseTransactionFilters({ statut: "pointee", q: "   " })).toMatchObject({ status: "CLEARED", query: null });
    expect(parseTransactionFilters({})).toEqual({ accountId: null, categoryId: null, status: null, query: null });
  });

  it("prefers the URL, then the remembered view, then detailed", () => {
    expect(parseView("groupee", "detaillee")).toBe("grouped");
    expect(parseView("detaillee", "groupee")).toBe("detailed");
    expect(parseView(undefined, "groupee")).toBe("grouped");
    expect(parseView(undefined, undefined)).toBe("detailed");
  });
});
