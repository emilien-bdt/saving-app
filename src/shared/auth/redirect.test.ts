import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/finances", "/finances"],
    ["/finances?mois=2026-11", "/finances?mois=2026-11"],
    [undefined, "/"],
    [null, "/"],
    ["", "/"],
    ["https://evil.com", "/"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["finances", "/"],
    ["/login", "/"],
    ["/login?next=/x", "/"],
  ])("%j → %j", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
