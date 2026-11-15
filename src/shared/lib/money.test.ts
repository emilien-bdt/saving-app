import { describe, expect, it } from "vitest";
import {
  decimalToCents,
  formatCents,
  parseAmountToCents,
  positiveAmountSchema,
} from "./money";

// Intl uses narrow no-break spaces in fr-FR; normalize them for readable assertions.
const plain = (value: string) => value.replace(/ | /g, " ");

describe("formatCents", () => {
  it("formats cents as French euros", () => {
    expect(plain(formatCents(123456))).toBe("1 234,56 €");
    expect(plain(formatCents(5))).toBe("0,05 €");
    expect(plain(formatCents(-2057))).toBe("-20,57 €");
  });

  it("rejects non-integer values", () => {
    expect(() => formatCents(12.5)).toThrow(RangeError);
  });
});

describe("parseAmountToCents", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12.50", 1250],
    ["0,05", 5],
    ["1 234,56", 123456],
    ["1 234,56", 123456],
    ["12 €", 1200],
    ["-3,20", -320],
    ["  7,99 ", 799],
  ])("parses %j as %i cents", (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "12,345", "1,2,3", "12.", ",5", "--3"])(
    "returns null for %j",
    (input) => {
      expect(parseAmountToCents(input)).toBeNull();
    },
  );
});

describe("decimalToCents", () => {
  it("absorbs floating point noise from Excel values", () => {
    expect(decimalToCents(16.489999999999998)).toBe(1649);
    expect(decimalToCents(77.430000000000007)).toBe(7743);
    expect(decimalToCents(31.300000000000004)).toBe(3130);
    expect(decimalToCents(0.1 + 0.2)).toBe(30);
  });

  it("rejects non-finite values", () => {
    expect(() => decimalToCents(Number.NaN)).toThrow(RangeError);
  });
});

describe("positiveAmountSchema", () => {
  it("outputs cents for a valid amount", () => {
    expect(positiveAmountSchema.parse("8,99")).toBe(899);
  });

  it("rejects zero, negative and invalid amounts with French messages", () => {
    expect(positiveAmountSchema.safeParse("0").error?.issues[0]?.message).toBe(
      "Le montant doit être supérieur à 0",
    );
    expect(positiveAmountSchema.safeParse("-5").success).toBe(false);
    expect(positiveAmountSchema.safeParse("abc").error?.issues[0]?.message).toBe(
      "Montant invalide",
    );
  });
});
