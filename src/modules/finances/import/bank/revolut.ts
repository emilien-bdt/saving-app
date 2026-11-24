import {
  findColumns,
  ISO_DATE_TIME,
  type ParsedStatement,
  parseDecimalCents,
  parseStatementDate,
  plainKey,
  type RowKind,
  type RowState,
  type StatementRow,
} from "./statement";

/**
 * Revolut statements (personal account), two layouts:
 * - « revolut »: export of the transactions (Type, Produit, Date de début, …, Montant, Frais, État)
 *   — every product (current account « Valeur actuelle », savings « Dépôt », pockets…) in one file;
 * - « revolut-savings »: statement of a savings account (Date, Description, Intérêts bruts,
 *   Argent entrant, Argent sortant, Solde).
 * French and English headers are both read.
 */

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

/** Product name given to the rows of a savings statement (the file does not say which account it is). */
export const SAVINGS_STATEMENT_PRODUCT = "Épargne";

function kindOf(type: string): RowKind {
  const value = plainKey(type);
  if (value.includes("carte") || value.includes("card")) return "CARD";
  if (value.startsWith("interet") || value.startsWith("interest")) return "INTEREST";
  if (value.includes("ajout de fonds") || value.includes("topup") || value.includes("top up")) return "TOPUP";
  if (value.startsWith("virement") || value.startsWith("transfer")) return "TRANSFER";
  return "OTHER";
}

function stateOf(state: string): RowState {
  const value = plainKey(state);
  if (value === "termine" || value === "completed") return "COMPLETED";
  if (value === "en attente" || value === "pending") return "PENDING";
  if (/^(renvoye|reverted|refuse|declined|annule|cancelled|canceled|echoue|failed)/.test(value)) return "CANCELLED";
  return "UNKNOWN";
}

function parseTransactions(table: string[][], index: Record<keyof typeof HEADERS, number>): ParsedStatement {
  const rows: StatementRow[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((cells, position) => {
    const line = position + 2;
    const cell = (name: keyof typeof HEADERS) => (cells[index[name]] ?? "").trim();
    const started = ISO_DATE_TIME.exec(cell("started"));
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
      merchant: null,
      bankCategory: null,
      amountCents: amount - fee,
      currency: cell("currency").toUpperCase() || "EUR",
      state: stateOf(cell("state")),
      stateLabel: cell("state"),
    });
  });
  return { source: "REVOLUT", format: "revolut", rows, errors };
}

function parseSavings(table: string[][], index: Record<keyof typeof SAVINGS_HEADERS, number>): ParsedStatement {
  const rows: StatementRow[] = [];
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
    const interest = /^(interets|interest)/.test(plainKey(description));
    rows.push({
      line,
      product: SAVINGS_STATEMENT_PRODUCT,
      kind: interest ? "INTEREST" : "TRANSFER",
      typeLabel: interest ? "Intérêts" : "Mouvement",
      startedAt: dateIso,
      dateIso,
      description,
      merchant: null,
      bankCategory: null,
      amountCents: Math.abs(moneyIn) - Math.abs(moneyOut),
      currency: "EUR",
      state: "COMPLETED",
      stateLabel: "Terminé",
    });
  });
  return { source: "REVOLUT", format: "revolut-savings", rows, errors };
}

/** Reads a Revolut table; null when the header is not a Revolut one. */
export function readRevolut(table: string[][]): ParsedStatement | null {
  const header = table[0] ?? [];
  const transactions = findColumns(header, HEADERS);
  if (transactions) return parseTransactions(table, transactions);
  const savings = findColumns(header, SAVINGS_HEADERS);
  if (savings) return parseSavings(table, savings);
  return null;
}
