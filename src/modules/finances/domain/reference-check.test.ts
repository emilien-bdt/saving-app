import { describe, expect, it } from "vitest";
import { checkReferences } from "./reference-check";

const account = { id: "cc", archived: false };
const courses = { id: "courses", kind: "EXPENSE", archived: false } as const;

describe("checkReferences", () => {
  it("accepts valid references", () => {
    expect(checkReferences({ type: "EXPENSE", account, toAccount: null, category: courses })).toEqual([]);
    expect(checkReferences({ type: "TRANSFER", account, toAccount: { id: "la", archived: false }, category: null })).toEqual([]);
  });

  it("refuses missing references and kind mismatches", () => {
    expect(checkReferences({ type: "EXPENSE", account: null, toAccount: null, category: null }).map((i) => i.field)).toEqual([
      "accountId",
      "categoryId",
    ]);
    expect(checkReferences({ type: "INCOME", account, toAccount: null, category: courses })).toEqual([
      { field: "categoryId", message: "Choisis une catégorie de revenu" },
    ]);
    expect(checkReferences({ type: "TRANSFER", account, toAccount: null, category: null })[0]?.field).toBe("toAccountId");
  });

  it("refuses archived references unless the edited transaction already used them", () => {
    const archived = { id: "la", archived: true };
    expect(checkReferences({ type: "EXPENSE", account: archived, toAccount: null, category: courses })[0]?.message).toBe(
      "Ce compte est archivé",
    );
    expect(
      checkReferences({ type: "EXPENSE", account: archived, toAccount: null, category: courses, keptIds: new Set(["la"]) }),
    ).toEqual([]);
  });
});
