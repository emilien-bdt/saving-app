import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectLayout, ImportError } from "./parse-sheet";
import { buildImportPlan, yearFromFileName } from "./plan";
import { reconcile } from "./reconcile";
import { readWorkbook, type Sheet } from "./xlsx";

const workbook = readWorkbook(readFileSync(new URL("./__fixtures__/Budget-2025.xlsx", import.meta.url)));
const plan = buildImportPlan([{ fileName: "Budget-2025.xlsx", workbook }]);
const byRef = (ref: string) => plan.transactions.find((transaction) => transaction.importRef === `2025-03/${ref}`);
const iso = (date: Date | undefined) => date?.toISOString().slice(0, 10);

describe("buildImportPlan (fixture, March 2025)", () => {
  it("imports every filled row of the monthly sheets only", () => {
    expect(plan.months.map((month) => month.sheetName)).toEqual(["03"]);
    expect(plan.transactions.map((transaction) => transaction.importRef).sort()).toEqual(
      ["J3", "J4#1", "J4#2", "Q3", "X3", "X4#1", "X4#2", "X5", "Q16", "J17"].map((ref) => `2025-03/${ref}`).sort(),
    );
  });

  it("maps incomes, with tickets restaurant detected from the label", () => {
    expect(byRef("J3")).toMatchObject({ type: "INCOME", accountKey: "CC", categoryKey: "APPORTS", label: "Bourses & aides" });
    expect(byRef("J4#1")).toMatchObject({ amountCents: 1000, categoryKey: "TICKETS_RESTAURANT" });
    expect(byRef("Q3")).toMatchObject({ type: "INCOME", accountKey: "LA", amountCents: 1000 });
  });

  it("maps expenses: label / note, split formulas, unknown day, planned rows", () => {
    expect(byRef("X3")).toMatchObject({ label: "Auchan - Herouville", note: "Crêpes", categoryKey: "COURSES", status: "CLEARED" });
    expect(iso(byRef("X3")?.date)).toBe("2025-03-07");
    expect([byRef("X4#1")?.amountCents, byRef("X4#2")?.amountCents]).toEqual([120, 230]);
    expect(byRef("X4#1")?.dayUnknown).toBe(true);
    expect(iso(byRef("X4#1")?.date)).toBe("2025-03-31");
    expect(byRef("X5")?.status).toBe("PLANNED");
    expect(byRef("Q16")).toMatchObject({ categoryKey: "LOGEMENT", amountCents: 18786 });
  });

  it("maps transfers", () => {
    expect(byRef("J17")).toMatchObject({
      type: "TRANSFER",
      accountKey: "CC",
      toAccountKey: "LA",
      categoryKey: null,
      label: "Virement Compte Courant → Livret A",
      dayUnknown: true,
    });
  });

  it("takes initial balances from the first month and lists the accounts", () => {
    expect(plan.accounts).toEqual(["CC", "LA", "LJ"]);
    expect(plan.initialBalances).toMatchObject({ CC: 10000, LA: 5000, LJ: 0, MATELAS: 0 });
    expect(iso(plan.startDate)).toBe("2025-03-01");
  });

  it("recomputes the same cleared balances as the Excel cells", () => {
    const checks = reconcile(plan);
    expect(checks.map(({ cell, excelCents, diffCents }) => [cell, excelCents, diffCents])).toEqual([
      ["C7", 38553, 0],
      ["C17", 9000, 0],
      ["C23", 0, 0],
    ]);
  });

  it("reports a balance mismatch", () => {
    const altered = { ...plan, initialBalances: { ...plan.initialBalances, CC: 10100 } };
    expect(reconcile(altered)[0]?.diffCents).toBe(100);
  });
});

describe("layouts", () => {
  const sheetWith = (cells: Record<string, string>): Sheet =>
    new Map(Object.entries(cells).map(([ref, value]) => [ref, { value, formula: null }]));

  it("detects the three layouts of the files", () => {
    expect(detectLayout(sheetWith({ B14: "Livret A", B20: "Livret Jeune" }))).toBe("LIVRETS");
    expect(detectLayout(sheetWith({ B14: "Matelas de sécurité", B20: "Autres" }))).toBe("TRANSITION");
    expect(detectLayout(sheetWith({ B14: "Matelas de sécurité", B20: "Pockets (total)" }))).toBe("POCKETS");
    expect(() => detectLayout(sheetWith({ B14: "?" }))).toThrow(ImportError);
  });
});

describe("yearFromFileName", () => {
  it.each([
    ["Budget-2025.xlsm", 2025],
    ["534d65e3-Budget-2024.xlsm", 2024],
    ["budget 2026 (copie).xlsm", 2026],
    ["export-2026.xlsx", 2026],
  ])("%j → %d", (fileName, year) => {
    expect(yearFromFileName(fileName)).toBe(year);
  });

  it("refuses a file name without year", () => {
    expect(() => yearFromFileName("budget.xlsm")).toThrow(ImportError);
  });
});
