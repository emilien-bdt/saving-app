import { describe, expect, it } from "vitest";
import {
  applySuggestion,
  centsToInput,
  changeDate,
  changeType,
  emptyFormValues,
  formValuesFromTransaction,
  formValuesToInput,
  valuesForNextEntry,
} from "./transaction-form";

const empty = emptyFormValues({ date: "2026-11-16", accountId: "cc" });
const kinds: Record<string, "EXPENSE" | "INCOME"> = { courses: "EXPENSE", apports: "INCOME" };
const kindOf = (id: string) => kinds[id];

describe("transaction form", () => {
  it("starts as a cleared expense of today on the default account", () => {
    expect(empty).toMatchObject({ type: "EXPENSE", status: "CLEARED", date: "2026-11-16", accountId: "cc", amount: "" });
  });

  it("formats cents for the amount input", () => {
    expect([centsToInput(1250), centsToInput(5), centsToInput(123456), centsToInput(-2057)]).toEqual([
      "12,50",
      "0,05",
      "1234,56",
      "-20,57",
    ]);
  });

  it("loads a transaction", () => {
    expect(
      formValuesFromTransaction({
        type: "TRANSFER",
        amountCents: 70000,
        label: "Virement",
        note: null,
        dateIso: "2026-03-31",
        dayUnknown: true,
        accountId: "cc",
        toAccountId: "la",
        categoryId: null,
        status: "PLANNED",
      }),
    ).toMatchObject({ amount: "700,00", note: "", toAccountId: "la", dayUnknown: true });
  });

  it("drops what no longer fits when the type changes", () => {
    const expense = { ...empty, categoryId: "courses" };
    expect(changeType(expense, "INCOME", kindOf)).toMatchObject({ type: "INCOME", categoryId: null });
    expect(changeType(expense, "EXPENSE", kindOf).categoryId).toBe("courses");
    expect(changeType({ ...empty, type: "TRANSFER", toAccountId: "la" }, "EXPENSE", kindOf).toAccountId).toBeNull();
  });

  it("picks the usual category of a known label unless the user chose one", () => {
    const suggestion = { labelKey: "bourses", label: "Bourses", type: "INCOME", categoryId: "apports", count: 19 } as const;
    expect(applySuggestion(empty, suggestion, false)).toMatchObject({ label: "Bourses", type: "INCOME", categoryId: "apports" });
    expect(applySuggestion({ ...empty, categoryId: "courses" }, suggestion, true)).toMatchObject({
      label: "Bourses",
      type: "EXPENSE",
      categoryId: "courses",
    });
  });

  it("gives a real day to a row without day once its date changes", () => {
    const unknown = { ...empty, date: "2026-03-31", dayUnknown: true };
    expect(changeDate(unknown, "2026-03-31").dayUnknown).toBe(true);
    expect(changeDate(unknown, "2026-03-12").dayUnknown).toBe(false);
  });

  it("keeps the context for the next entry", () => {
    const filled = { ...empty, type: "INCOME" as const, amount: "12", label: "Papa", note: "x", categoryId: "apports", date: "2026-11-01" };
    expect(valuesForNextEntry(filled)).toEqual({ ...filled, amount: "", label: "", note: "", categoryId: null });
  });

  it("builds the action input, dropping fields that do not apply", () => {
    expect(formValuesToInput({ ...empty, amount: "12,5", label: "Pain", note: "  ", categoryId: "courses", toAccountId: "la" })).toEqual({
      date: "2026-11-16",
      dayUnknown: false,
      amount: "12,5",
      type: "EXPENSE",
      status: "CLEARED",
      label: "Pain",
      note: null,
      accountId: "cc",
      toAccountId: null,
      categoryId: "courses",
    });
    expect(formValuesToInput({ ...empty, type: "TRANSFER", categoryId: "courses", toAccountId: "la" })).toMatchObject({
      categoryId: null,
      toAccountId: "la",
    });
  });
});
