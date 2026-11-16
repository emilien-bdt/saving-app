import { describe, expect, it } from "vitest";
import { groupByDay, groupByLabel, type ListTransaction, signedAmountCents, summarizeMonth } from "./transaction-list";

let next = 0;
const tx = (overrides: Partial<ListTransaction>): ListTransaction => ({
  id: `t${next++}`,
  dateIso: "2026-11-03",
  dayUnknown: false,
  amountCents: 100,
  type: "EXPENSE",
  status: "CLEARED",
  label: "Boulangerie",
  labelKey: "boulangerie",
  categoryId: "courses",
  ...overrides,
});

describe("groupByDay", () => {
  it("sorts days (most recent first) and puts unknown days last", () => {
    const groups = groupByDay([
      tx({ dateIso: "2026-11-03", amountCents: 380 }),
      tx({ dateIso: "2026-11-30", dayUnknown: true, amountCents: 1000 }),
      tx({ dateIso: "2026-11-10", type: "INCOME", amountCents: 5000 }),
      tx({ dateIso: "2026-11-03", type: "TRANSFER", categoryId: null, amountCents: 9999 }),
    ]);
    expect(groups.map((group) => [group.key, group.items.length, group.netCents])).toEqual([
      ["2026-11-10", 1, 5000],
      ["2026-11-03", 2, -380],
      ["unknown", 1, -1000],
    ]);
    expect(groups.at(-1)?.dateIso).toBeNull();
  });
});

describe("groupByLabel", () => {
  it("groups repeated purchases by label, type and category", () => {
    const groups = groupByLabel([
      tx({ amountCents: 380 }),
      tx({ amountCents: 610, status: "PLANNED" }),
      tx({ label: "Uber eats", labelKey: "uber eats", categoryId: "sorties", amountCents: 2639 }),
      tx({ label: "Boulangerie", categoryId: "sorties", amountCents: 1700 }),
    ]);
    expect(groups.map((group) => [group.label, group.categoryId, group.items.length, group.totalCents, group.plannedCount])).toEqual([
      ["Uber eats", "sorties", 1, 2639, 0],
      ["Boulangerie", "sorties", 1, 1700, 0],
      ["Boulangerie", "courses", 2, 990, 1],
    ]);
  });
});

describe("summarizeMonth / signedAmountCents", () => {
  it("sums incomes and expenses, transfers excluded", () => {
    expect(
      summarizeMonth([
        tx({ type: "INCOME", amountCents: 67120 }),
        tx({ amountCents: 84004 }),
        tx({ amountCents: 1000, status: "PLANNED" }),
        tx({ type: "TRANSFER", amountCents: 8000 }),
      ]),
    ).toEqual({
      income: { clearedCents: 67120, projectedCents: 67120 },
      expense: { clearedCents: 84004, projectedCents: 85004 },
      trend: { clearedCents: -16884, projectedCents: -17884 },
    });
    expect([signedAmountCents(tx({ type: "INCOME" })), signedAmountCents(tx({})), signedAmountCents(tx({ type: "TRANSFER" }))]).toEqual([100, -100, 0]);
  });
});
