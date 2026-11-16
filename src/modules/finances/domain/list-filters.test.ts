import { describe, expect, it } from "vitest";
import { matchesListFilters, type TransactionFilters } from "./list-filters";

const none: TransactionFilters = { accountId: null, categoryId: null, status: null, query: null };
const interest = { accountId: "matelas", toAccountId: null, categoryId: null, status: "CLEARED" as const, label: "Intérêts", note: null };

describe("matchesListFilters (computed rows)", () => {
  it("applies the Journal filters like the database query", () => {
    expect(matchesListFilters(interest, none)).toBe(true);
    expect(matchesListFilters(interest, { ...none, accountId: "matelas" })).toBe(true);
    expect(matchesListFilters(interest, { ...none, accountId: "cc" })).toBe(false);
    expect(matchesListFilters(interest, { ...none, categoryId: "courses" })).toBe(false);
    expect(matchesListFilters(interest, { ...none, status: "PLANNED" })).toBe(false);
    expect(matchesListFilters(interest, { ...none, query: "interet" })).toBe(true);
    expect(matchesListFilters(interest, { ...none, query: "auchan" })).toBe(false);
  });
});
