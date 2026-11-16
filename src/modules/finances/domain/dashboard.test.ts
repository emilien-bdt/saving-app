import { describe, expect, it } from "vitest";
import { buildDashboard, type DashboardAccountInput, type DashboardCategoryInput, type DashboardTransaction } from "./dashboard";

const accounts: DashboardAccountInput[] = [
  { id: "cc", name: "Compte Courant", type: "CHECKING", parentId: null, initialBalanceCents: 10_000, archived: false, openedOnIso: "2026-01-01" },
  { id: "la", name: "Livret A", type: "SAVINGS", parentId: null, initialBalanceCents: 50_000, archived: true, openedOnIso: "2026-01-01" },
  { id: "voiture", name: "Voiture", type: "SAVINGS", parentId: "cc", initialBalanceCents: 0, archived: false, openedOnIso: "2026-01-01" },
  { id: "futur", name: "Futur", type: "SAVINGS", parentId: null, initialBalanceCents: 0, archived: false, openedOnIso: "2026-01-01" },
];
const categories: DashboardCategoryInput[] = [
  { id: "apports", name: "Apports", kind: "INCOME", color: "#0f0", icon: null, parentId: null },
  { id: "fixes", name: "Charges fixes", kind: "EXPENSE", color: "#70f", icon: null, parentId: null },
  { id: "loyer", name: "Logement", kind: "EXPENSE", color: "#70f", icon: null, parentId: "fixes" },
  { id: "abos", name: "Abonnements", kind: "EXPENSE", color: "#70f", icon: null, parentId: "fixes" },
  { id: "courses", name: "Courses", kind: "EXPENSE", color: "#f60", icon: null, parentId: null },
];

let next = 0;
const tx = (dateIso: string, overrides: Partial<DashboardTransaction>): DashboardTransaction => ({
  id: `t${next++}`,
  dateIso,
  type: "EXPENSE",
  status: "CLEARED",
  amountCents: 0,
  accountId: "cc",
  toAccountId: null,
  categoryId: "courses",
  label: "Carrefour",
  labelKey: "carrefour",
  ...overrides,
});

const transactions = [
  // February
  tx("2026-02-03", { amountCents: 4_000 }),
  tx("2026-02-05", { type: "INCOME", categoryId: "apports", label: "Salaire", labelKey: "salaire", amountCents: 100_000 }),
  tx("2026-02-28", { type: "TRANSFER", categoryId: null, toAccountId: "cc", accountId: "la", amountCents: 50_000 }),
  // March
  tx("2026-03-01", { categoryId: "loyer", label: "Loyer", labelKey: "loyer", amountCents: 20_000 }),
  tx("2026-03-02", { categoryId: "abos", label: "Spotify", labelKey: "spotify", amountCents: 1_100 }),
  tx("2026-03-04", { amountCents: 3_000 }),
  tx("2026-03-09", { amountCents: 2_000 }),
  tx("2026-03-10", { label: "Auchan", labelKey: "auchan", amountCents: 1_500, status: "PLANNED" }),
  tx("2026-03-05", { type: "INCOME", categoryId: "apports", label: "Salaire", labelKey: "salaire", amountCents: 100_000 }),
  tx("2026-03-31", { type: "TRANSFER", categoryId: null, toAccountId: "voiture", amountCents: 10_000 }),
  // April (after the displayed month)
  tx("2026-04-02", { type: "TRANSFER", categoryId: null, toAccountId: "futur", amountCents: 5_000 }),
];

describe("buildDashboard (March 2026)", () => {
  const dashboard = buildDashboard({ month: { year: 2026, month: 3 }, accounts, categories, transactions });

  it("computes start / actual / projected balances like the Excel sheet", () => {
    const cc = dashboard.accounts.find((account) => account.id === "cc");
    // start = 100 + 1000 − 40 + 500 = 1560 €; March cleared: +1000 − 200 − 11 − 30 − 20 − 100 = +639; planned −15
    expect(cc).toMatchObject({ startCents: 156_000, balance: { clearedCents: 219_900, projectedCents: 218_400 } });
    expect(cc?.totalBalance).toEqual({ clearedCents: 229_900, projectedCents: 228_400 });
    expect(dashboard.total).toEqual({ clearedCents: 229_900, projectedCents: 228_400 });
    // Pockets are totalled apart from savings.
    expect(dashboard.savings).toEqual({ clearedCents: 0, projectedCents: 0 });
    expect(dashboard.pockets).toEqual({ clearedCents: 10_000, projectedCents: 10_000 });
  });

  it("hides empty closed accounts and accounts opened later", () => {
    expect(dashboard.accounts.map((account) => account.id)).toEqual(["cc", "voiture"]);
    const created = { id: "neuf", name: "Neuf", type: "SAVINGS" as const, parentId: null, initialBalanceCents: 0, archived: false };
    const withNew = (openedOnIso: string) =>
      buildDashboard({ month: { year: 2026, month: 3 }, accounts: [...accounts, { ...created, openedOnIso }], categories, transactions });
    expect(withNew("2026-04-10").accounts.map((account) => account.id)).not.toContain("neuf");
    expect(withNew("2026-03-10").accounts.map((account) => account.id)).toContain("neuf");
  });

  it("splits accounts into Courant / Épargne / Pockets blocks with their own totals", () => {
    expect(
      dashboard.groups.map((line) => [line.group, line.startCents, line.balance.clearedCents, line.balance.projectedCents, line.accounts.map((a) => a.id)]),
    ).toEqual([
      ["CHECKING", 156_000, 219_900, 218_400, ["cc"]],
      ["POCKETS", 0, 10_000, 10_000, ["voiture"]],
    ]);
    expect(dashboard.accounts.find((account) => account.id === "voiture")).toMatchObject({ parentName: "Compte Courant", group: "POCKETS" });
  });

  it("summarizes the month and compares with the previous one", () => {
    expect(dashboard.income.clearedCents).toBe(100_000);
    expect(dashboard.expense).toEqual({ clearedCents: 26_100, projectedCents: 27_600 });
    expect(dashboard.trend.projectedCents).toBe(72_400);
    expect(dashboard.previous).toEqual({ totalCents: 156_000, savingsCents: 0, pocketsCents: 0, trendCents: 96_000, expenseCents: 4_000 });
  });

  it("groups expenses by top-level category with children, history and top labels", () => {
    expect(dashboard.expenses.map((line) => [line.id, line.projectedCents, line.clearedCents, line.previousCents, line.averageCents])).toEqual([
      ["fixes", 21_100, 21_100, 0, 0],
      ["courses", 6_500, 5_000, 4_000, 4_000],
    ]);
    expect(dashboard.expenses[0]?.children).toEqual([
      { id: "loyer", name: "Logement", cents: 20_000 },
      { id: "abos", name: "Abonnements", cents: 1_100 },
    ]);
    expect(dashboard.expenses[1]?.topLabels).toEqual([
      { label: "Carrefour", count: 2, cents: 5_000 },
      { label: "Auchan", count: 1, cents: 1_500 },
    ]);
    expect(dashboard.expenses[0]?.share).toBeCloseTo(21_100 / 27_600);
  });

  it("lists incomes, transfers, planned rows and merchants", () => {
    expect(dashboard.incomes).toEqual([{ label: "Salaire", count: 1, cents: 100_000 }]);
    expect(dashboard.transfers).toEqual([{ fromId: "cc", toId: "voiture", count: 1, cents: 10_000 }]);
    expect(dashboard.planned).toMatchObject({ count: 1, cents: -1_500 });
    expect(dashboard.topMerchants[0]).toEqual({ label: "Loyer", count: 1, cents: 20_000, categoryId: "loyer" });
  });

  it("builds 12 months of history, without data before the first transaction", () => {
    expect(dashboard.history).toHaveLength(12);
    expect(dashboard.history.at(-1)).toMatchObject({ key: "2026-03", totalCents: 229_900, trendCents: 72_400 });
    expect(dashboard.history.at(-2)).toMatchObject({ key: "2026-02", hasData: true, totalCents: 156_000 });
    expect(dashboard.history.at(-3)).toMatchObject({ key: "2026-01", hasData: false });
  });
});
