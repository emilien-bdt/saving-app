import { describe, expect, it } from "vitest";
import { accountInputSchema } from "./account";

describe("accountInputSchema", () => {
  it("turns the form kind into type + parent", () => {
    expect(accountInputSchema.parse({ name: " Revolut ", kind: "CHECKING", parentId: "cc", color: "#2563EB", icon: "wallet" })).toEqual({
      name: "Revolut",
      type: "CHECKING",
      parentId: null,
      color: "#2563eb",
      icon: "wallet",
    });
    expect(accountInputSchema.parse({ name: "Vacances", kind: "POCKET", parentId: "cc", color: "#9333ea" })).toEqual({
      name: "Vacances",
      type: "SAVINGS",
      parentId: "cc",
      color: "#9333ea",
      icon: null,
    });
  });

  it("requires a name, a parent for a pocket, a valid color and a known icon", () => {
    const issues = (input: Record<string, unknown>) =>
      accountInputSchema.safeParse({ name: "X", kind: "SAVINGS", color: "#000000", ...input }).error?.issues.map((issue) => issue.path[0]);
    expect(issues({ name: "  " })).toEqual(["name"]);
    expect(issues({ kind: "POCKET", parentId: "" })).toEqual(["parentId"]);
    expect(issues({ color: "red" })).toEqual(["color"]);
    expect(issues({ icon: "rocket" })).toEqual(["icon"]);
  });
});
