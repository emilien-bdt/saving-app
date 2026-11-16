import { describe, expect, it } from "vitest";
import {
  type BalanceAccount,
  type BalanceTransaction,
  computeOwnBalances,
  computeTrend,
  summarizeBalances,
  withPockets,
} from "./balances";

const accounts: BalanceAccount[] = [
  { id: "cc", type: "CHECKING", parentId: null, initialBalanceCents: 20_000 },
  { id: "la", type: "SAVINGS", parentId: null, initialBalanceCents: 600_000 },
  { id: "pocket", type: "SAVINGS", parentId: "cc", initialBalanceCents: 5_000 },
];

const tx = (overrides: Partial<BalanceTransaction>): BalanceTransaction => ({
  type: "EXPENSE",
  status: "CLEARED",
  amountCents: 0,
  accountId: "cc",
  toAccountId: null,
  ...overrides,
});

describe("computeOwnBalances", () => {
  it("applies incomes, expenses and transfers; planned only in projected", () => {
    const balances = computeOwnBalances(accounts, [
      tx({ type: "INCOME", amountCents: 180_000 }),
      tx({ type: "EXPENSE", amountCents: 86_700 }),
      tx({ type: "EXPENSE", amountCents: 3_000, status: "PLANNED" }),
      tx({ type: "TRANSFER", amountCents: 70_000, toAccountId: "la" }),
      tx({ type: "TRANSFER", amountCents: 1_000, toAccountId: "pocket", status: "PLANNED" }),
    ]);
    expect(balances.get("cc")).toEqual({ clearedCents: 43_300, projectedCents: 39_300 });
    expect(balances.get("la")).toEqual({ clearedCents: 670_000, projectedCents: 670_000 });
    expect(balances.get("pocket")).toEqual({ clearedCents: 5_000, projectedCents: 6_000 });
  });

  it("throws on an unknown account", () => {
    expect(() => computeOwnBalances(accounts, [tx({ accountId: "nope", amountCents: 1 })])).toThrow();
  });
});

describe("withPockets / summarizeBalances", () => {
  const own = computeOwnBalances(accounts, [tx({ type: "TRANSFER", amountCents: 2_000, toAccountId: "pocket" })]);

  it("adds pockets to their parent; a transfer to a pocket keeps the parent total", () => {
    const totals = withPockets(accounts, own);
    expect(totals.get("cc")).toEqual({ clearedCents: 25_000, projectedCents: 25_000 });
    expect(totals.get("pocket")).toEqual({ clearedCents: 7_000, projectedCents: 7_000 });
  });

  it("sums the total and the savings (pockets count with their own type)", () => {
    expect(summarizeBalances(accounts, own)).toEqual({
      total: { clearedCents: 625_000, projectedCents: 625_000 },
      savings: { clearedCents: 607_000, projectedCents: 607_000 },
    });
  });
});

describe("computeTrend", () => {
  it("is incomes minus expenses, ignoring transfers", () => {
    expect(
      computeTrend([
        tx({ type: "INCOME", amountCents: 67_120 }),
        tx({ type: "EXPENSE", amountCents: 84_004 }),
        tx({ type: "EXPENSE", amountCents: 1_000, status: "PLANNED" }),
        tx({ type: "TRANSFER", amountCents: 8_000, toAccountId: "la" }),
      ]),
    ).toEqual({ clearedCents: -16_884, projectedCents: -17_884 });
  });
});
