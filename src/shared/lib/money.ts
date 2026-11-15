import { z } from "zod";

/**
 * Money helpers. Amounts are always handled as integer cents to avoid
 * floating point errors (see CLAUDE.md, "Règles métier").
 */

export type Cents = number;

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

/** Formats cents as a French euro string, e.g. 123456 -> "1 234,56 €". */
export function formatCents(cents: Cents): string {
  assertCents(cents);
  return euroFormatter.format(cents / 100);
}

/**
 * Parses a user-typed amount into cents without going through floats.
 * Accepts "12", "12,5", "12.50", "1 234,56", "-3,20", "12 €".
 * Returns null when the input is not a valid amount (max 2 decimals).
 */
export function parseAmountToCents(input: string): Cents | null {
  const normalized = input
    .trim()
    .replace(/\s| | /g, "")
    .replace(/€$/, "")
    .replace(",", ".");

  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const [, sign, units, decimals = ""] = match;
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return sign ? -cents : cents;
}

/** Converts a decimal number (e.g. read from Excel) to cents, rounding to the nearest cent. */
export function decimalToCents(value: number): Cents {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Invalid amount: ${value}`);
  }
  // Round via the string representation to absorb binary noise (16.489999999 -> 1649).
  return Math.round(Number(value.toFixed(6)) * 100);
}

export function assertCents(value: number): asserts value is Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Amount must be an integer number of cents, got ${value}`);
  }
}

/** Zod schema for a strictly positive amount typed by the user, output in cents. */
export const positiveAmountSchema = z
  .string()
  .transform((value, ctx) => {
    const cents = parseAmountToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Montant invalide" });
      return z.NEVER;
    }
    if (cents <= 0) {
      ctx.addIssue({ code: "custom", message: "Le montant doit être supérieur à 0" });
      return z.NEVER;
    }
    return cents;
  });
