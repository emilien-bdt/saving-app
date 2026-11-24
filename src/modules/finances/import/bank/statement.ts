/** Rows of a bank statement (Revolut, BoursoBank), as read from the CSV, before any decision. */

export type BankSource = "REVOLUT" | "BOURSOBANK";
export type StatementFormat = "revolut" | "revolut-savings" | "boursobank";

export type RowKind = "CARD" | "TRANSFER" | "TOPUP" | "INTEREST" | "OTHER";
export type RowState = "COMPLETED" | "PENDING" | "CANCELLED" | "UNKNOWN";

export type StatementRow = {
  /** Line in the file (the header is line 1). */
  line: number;
  /** Product / account of the bank (« Valeur actuelle », « BoursoBank ») — the account chosen for it receives the row. */
  product: string;
  kind: RowKind;
  /** Type as written in the file (« Paiement par carte »), or deduced from the label. */
  typeLabel: string;
  /** « AAAA-MM-JJ HH:MM:SS » (or « AAAA-MM-JJ »): part of the row identity. */
  startedAt: string;
  /** « AAAA-MM-JJ » */
  dateIso: string;
  description: string;
  /** Counterpart name found by the bank (BoursoBank « supplierFound »), used as label when present. */
  merchant: string | null;
  /** Category given by the bank (BoursoBank), a hint for ours. */
  bankCategory: string | null;
  /** Signed, fees included, in cents. */
  amountCents: number;
  currency: string;
  state: RowState;
  stateLabel: string;
};

export type ParsedStatement = { source: BankSource; format: StatementFormat; rows: StatementRow[]; errors: string[] };

export class StatementError extends Error {}

/** « Date de début » → « date de debut » (header and keyword comparisons). */
export const plainKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Index of each wanted column (one of its aliases); null when a required one is missing. */
export function findColumns<T extends Record<string, readonly string[]>>(
  header: readonly string[],
  required: T,
): Record<keyof T, number> | null {
  const keys = header.map(plainKey);
  const result: Partial<Record<keyof T, number>> = {};
  for (const [name, aliases] of Object.entries(required) as [keyof T, readonly string[]][]) {
    const index = keys.findIndex((value) => aliases.includes(value));
    if (index < 0) return null;
    result[name] = index;
  }
  return result as Record<keyof T, number>;
}

/** Index of an optional column, -1 when absent. */
export function findColumn(header: readonly string[], aliases: readonly string[]): number {
  return header.map(plainKey).findIndex((value) => aliases.includes(value));
}

/** « -25.90 », « 1 234,56 € », « 0,08€ », « −3,20 » → cents (null when not an amount). */
export function parseDecimalCents(input: string): number | null {
  let value = input.replace(/[\s  €]/g, "").replace(/^\+/, "").replace(/^[−–]/, "-");
  if (value === "") return null;
  // The last separator is the decimal one when followed by 1 or 2 digits.
  const decimal = /[.,](\d{1,2})$/.exec(value);
  let fraction = "";
  if (decimal) {
    fraction = decimal[1] ?? "";
    value = value.slice(0, decimal.index);
  }
  value = value.replace(/[.,]/g, "");
  const match = /^(-?)(\d+)$/.exec(value);
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return match[1] ? -cents : cents;
}

export const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;

const MONTHS: Record<string, number> = {
  janv: 1, jan: 1, janvier: 1, january: 1,
  fevr: 2, fev: 2, feb: 2, fevrier: 2, february: 2,
  mars: 3, mar: 3, march: 3,
  avr: 4, apr: 4, avril: 4, april: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6, june: 6,
  juil: 7, jul: 7, juillet: 7, july: 7,
  aout: 8, aug: 8, august: 8,
  sept: 9, sep: 9, septembre: 9, september: 9,
  oct: 10, octobre: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  dec: 12, decembre: 12, december: 12,
};

const pad = (value: number) => String(value).padStart(2, "0");

/** « 2026-11-06 », « 06/11/2026 », « 6 nov. 2026 », « Nov 6, 2026 » → « 2026-11-06 ». */
export function parseStatementDate(input: string): string | null {
  const text = input.trim();
  const iso = ISO_DATE_TIME.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slashed = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(text);
  if (slashed) {
    const day = Number(slashed[1]);
    const month = Number(slashed[2]);
    const year = (slashed[3] ?? "").length === 2 ? 2000 + Number(slashed[3]) : Number(slashed[3]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;
  for (const word of plainKey(text).split(" ")) {
    if (/^\d{4}$/.test(word)) year = Number(word);
    else if (/^\d{1,2}$/.test(word)) day = Number(word);
    else if (MONTHS[word] !== undefined) month = MONTHS[word];
  }
  if (!day || !month || !year || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}
