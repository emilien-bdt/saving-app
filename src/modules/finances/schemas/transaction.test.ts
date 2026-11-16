import { describe, expect, it } from "vitest";
import { transactionInputSchema } from "./transaction";

const base = {
  date: "2025-03-07",
  amount: "41,10",
  type: "EXPENSE",
  status: "CLEARED",
  label: " Carrefour - Herouville ",
  accountId: "cc",
  categoryId: "courses",
} as const;

describe("transactionInputSchema", () => {
  it("returns Prisma-ready data", () => {
    const result = transactionInputSchema.parse(base);
    expect(result).toEqual({
      date: new Date("2025-03-07T00:00:00Z"),
      dayUnknown: false,
      amountCents: 4110,
      type: "EXPENSE",
      status: "CLEARED",
      label: "Carrefour - Herouville",
      labelKey: "carrefour herouville",
      note: null,
      accountId: "cc",
      toAccountId: null,
      categoryId: "courses",
    });
  });

  it("accepts a transfer with a destination and no category", () => {
    const result = transactionInputSchema.parse({ ...base, type: "TRANSFER", categoryId: "", toAccountId: "la" });
    expect(result.toAccountId).toBe("la");
    expect(result.categoryId).toBeNull();
  });

  it.each([
    [{ amount: "0" }, "amount"],
    [{ amount: "abc" }, "amount"],
    [{ date: "07/03/2025" }, "date"],
    [{ label: "   " }, "label"],
    [{ categoryId: null }, "categoryId"],
    [{ type: "TRANSFER", toAccountId: "cc", categoryId: null }, "toAccountId"],
    [{ type: "TRANSFER", toAccountId: "la" }, "categoryId"],
  ])("rejects %j on %s", (overrides, field) => {
    const result = transactionInputSchema.safeParse({ ...base, ...overrides });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain(field);
  });
});
