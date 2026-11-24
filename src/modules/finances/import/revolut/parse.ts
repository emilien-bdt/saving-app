import { parseCsv } from "./csv";

/**
 * Revolut statements (personal account), two layouts:
 * - « revolut »: export of the transactions (Type, Produit, Date de début, …, Montant, Frais, État)
 *   — every product (current account « Valeur actuelle », savings « Dépôt », pockets…) in one file;
 * - « revolut-savings »: statement of a savings account (Date, Description, Intérêts bruts,
 *   Argent entrant, Argent sortant, Solde).
 * French and English headers are both read.
 */

export type RevolutKind = "CARD" | "TRANSFER" | "TOPUP" | "INTEREST" | "OTHER";
export type RevolutState = "COMPLETED" | "PENDING" | "CANCELLED" | "UNKNOWN";

export type RevolutRow = {
  /** Line in the file (the header is line 1). */
  line: number;
  /** Revolut product, e.g. « Valeur actuelle », « Dépôt »; the account chosen for it receives the row. */
  product: string;
  kind: RevolutKind;
  /** Type as written in the file (« Paiement par carte »). */
  typeLabel: string;
  /** « AAAA-MM-JJ HH:MM:SS » (or « AAAA-MM-JJ »): part of the row identity. */
  startedAt: string;
  /** « AAAA-MM-JJ » */
  dateIso: string;
  description: string;
  /** Signed, fees included (amount − fee), in cents. */
  amountCents: number;
  currency: string;
  state: RevolutState;
  stateLabel: string;
};

export type RevolutFormat = "revolut" | "revolut-savings";

export type ParsedStatement = { format: RevolutFormat; rows: RevolutRow[]; errors: string[] };

export class StatementError extends Error {}

const key = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const HEADERS = {
  type: ["type"],
  product: ["produit", "product"],
  started: ["date de debut", "started date"],
  description: ["description"],
  amount: ["montant", "amount"],
  fee: ["frais", "fee"],
  currency: ["devise", "currency"],
  state: ["etat", "state"],
} as const;

const SAVINGS_HEADERS = {
  date: ["date"],
  description: ["description"],
  moneyIn: ["argent entrant", "money in"],
  moneyOut: ["argent sortant", "money out"],
} as const;

function columns<T extends Record<string, readonly string[]>>(header: string[], wanted: T): Record<keyof T, number> | null {
  const keys = header.map(key);
  const result: Partial<Record<keyof T, number>> = {};
  for (const [name, aliases] of Object.entries(wanted) as [keyof T, readonly string[]][]) {
    const index = keys.findIndex((value) => aliases.includes(value));
    if (index < 0) return null;
    result[name] = index;
  }
  return result as Record<keyof T, number>;
}

/** « -25.90 », « 1 234,56 € », « 0,08€ » → cents (null when not an amount). */
export function parseDecimalCents(input: string): number | null {
  let value = input.replace(/[\s  €]/g, "").replace(/^\+/, "");
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

function kindOf(type: string): RevolutKind {
  const value = key(type);
  if (value.includes("carte") || value.includes("card")) return "CARD";
  if (value.startsWith("interet") || value.startsWith("interest")) return "INTEREST";
  if (value.includes("ajout de fonds") || value.includes("topup") || value.includes("top up")) return "TOPUP";
  if (value.startsWith("virement") || value.startsWith("transfer")) return "TRANSFER";
  return "OTHER";
}

function stateOf(state: string): RevolutState {
  const value = key(state);
  if (value === "termine" || value === "completed") return "COMPLETED";
  if (value === "en attente" || value === "pending") return "PENDING";
  if (/^(renvoye|reverted|refuse|declined|annule|cancelled|canceled|echoue|failed)/.test(value)) return "CANCELLED";
  return "UNKNOWN";
}

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;

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

/** « 6 nov. 2026 », « Nov 6, 2026 », « 2026-11-06 » → « 2026-11-06 ». */
export function parseStatementDate(input: string): string | null {
  const iso = DATE_TIME.exec(input.trim());
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const words = key(input).split(" ");
  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;
  for (const word of words) {
    if (/^\d{4}$/.test(word)) year = Number(word);
    else if (/^\d{1,2}$/.test(word)) day = Number(word);
    else if (MONTHS[word] !== undefined) month = MONTHS[word];
  }
  if (!day || !month || !year || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTransactions(table: string[][], index: Record<keyof typeof HEADERS, number>): ParsedStatement {
  const rows: RevolutRow[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((cells, position) => {
    const line = position + 2;
    const cell = (name: keyof typeof HEADERS) => (cells[index[name]] ?? "").trim();
    const started = DATE_TIME.exec(cell("started"));
    const amount = parseDecimalCents(cell("amount"));
    const fee = cell("fee") === "" ? 0 : parseDecimalCents(cell("fee"));
    if (!started || amount === null || fee === null) {
      errors.push(`Ligne ${line} illisible (date ou montant)`);
      return;
    }
    const dateIso = `${started[1]}-${started[2]}-${started[3]}`;
    rows.push({
      line,
      product: cell("product") || "?",
      kind: kindOf(cell("type")),
      typeLabel: cell("type"),
      startedAt: started[4] ? `${dateIso} ${started[4]}:${started[5]}:${started[6] ?? "00"}` : dateIso,
      dateIso,
      description: cell("description").replace(/\s+/g, " "),
      amountCents: amount - fee,
      currency: cell("currency").toUpperCase() || "EUR",
      state: stateOf(cell("state")),
      stateLabel: cell("state"),
    });
  });
  return { format: "revolut", rows, errors };
}

/** Product name given to the rows of a savings statement (the file does not say which account it is). */
export const SAVINGS_STATEMENT_PRODUCT = "Épargne";

function parseSavings(table: string[][], index: Record<keyof typeof SAVINGS_HEADERS, number>): ParsedStatement {
  const rows: RevolutRow[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((cells, position) => {
    const line = position + 2;
    const cell = (name: keyof typeof SAVINGS_HEADERS) => (cells[index[name]] ?? "").trim();
    const dateIso = parseStatementDate(cell("date"));
    const moneyIn = cell("moneyIn") === "" ? 0 : parseDecimalCents(cell("moneyIn"));
    const moneyOut = cell("moneyOut") === "" ? 0 : parseDecimalCents(cell("moneyOut"));
    if (!dateIso || moneyIn === null || moneyOut === null) {
      errors.push(`Ligne ${line} illisible (date ou montant)`);
      return;
    }
    const description = cell("description").replace(/\s+/g, " ");
    const interest = /^(interets|interest)/.test(key(description));
    rows.push({
      line,
      product: SAVINGS_STATEMENT_PRODUCT,
      kind: interest ? "INTEREST" : "TRANSFER",
      typeLabel: interest ? "Intérêts" : "Mouvement",
      startedAt: dateIso,
      dateIso,
      description,
      amountCents: Math.abs(moneyIn) - Math.abs(moneyOut),
      currency: "EUR",
      state: "COMPLETED",
      stateLabel: "Terminé",
    });
  });
  return { format: "revolut-savings", rows, errors };
}

/** Reads a Revolut CSV; throws StatementError when the layout is unknown. */
export function parseRevolutStatement(text: string): ParsedStatement {
  const table = parseCsv(text);
  const header = table[0];
  if (!header) throw new StatementError("Le fichier est vide");
  const transactions = columns(header, HEADERS);
  if (transactions) return parseTransactions(table, transactions);
  const savings = columns(header, SAVINGS_HEADERS);
  if (savings) return parseSavings(table, savings);
  throw new StatementError("Format non reconnu : exporte un relevé Revolut au format Excel (CSV)");
}
