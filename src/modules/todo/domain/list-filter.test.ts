import { describe, expect, it } from "vitest";
import { listFilterHref, parseListFilter } from "./list-filter";

describe("parseListFilter", () => {
  it.each([
    [undefined, { kind: "all" }],
    ["", { kind: "all" }],
    ["aucune", { kind: "none" }],
    ["clx123abc", { kind: "list", id: "clx123abc" }],
    [["clxA", "clxB"], { kind: "list", id: "clxA" }],
    ["../etc", { kind: "all" }],
  ] as const)("%j", (value, expected) => {
    expect(parseListFilter(value as string | string[] | undefined)).toEqual(expected);
  });

  it("builds the page URL", () => {
    expect(listFilterHref({ kind: "all" })).toBe("/todo");
    expect(listFilterHref({ kind: "none" })).toBe("/todo?liste=aucune");
    expect(listFilterHref({ kind: "list", id: "abc" })).toBe("/todo?liste=abc");
  });
});
