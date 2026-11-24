import {
  findColumn,
  findColumns,
  findLastColumn,
  type ParsedStatement,
  parseDecimalCents,
  parseStatementDate,
  plainKey,
  type RowKind,
  type StatementRow,
} from "./statement";

/**
 * BoursoBank export (Mes comptes › Exporter les opérations, CSV, UTF-8 with BOM, « ; » separator):
 * "Date Opération";"Date Valeur";Libellé;"Libellé Suggéré";Catégorie;"Catégorie Parente";Solde;Commentaire;
 * "Numéro Compte";"Libellé Compte";Solde;Pointage
 * — the first « Solde » column is the amount (« -9,99 »), the second one the balance.
 * The English-named variant (dateOp;dateVal;label;category;categoryParent;supplierFound;amount;…) is read too.
 */

const HEADERS = {
  date: ["dateop", "date operation"],
  label: ["label", "libelle"],
} as const;

/** Product used when the file does not name the account. */
export const BOURSOBANK_PRODUCT = "BoursoBank";

function kindOf(label: string): RowKind {
  const value = plainKey(label);
  if (/^(carte|cb|avoir)\b/.test(value)) return "CARD";
  if (/^(vir|virement)\b/.test(value)) return "TRANSFER";
  if (/^(interets|int cred)\b/.test(value)) return "INTEREST";
  return "OTHER";
}

/** « Libellé Suggéré » is the merchant when BoursoBank found one, else the label in title case (« Vir Sepa … »): ignored then. */
function merchantOf(suggested: string): string | null {
  const value = suggested.trim();
  if (!/^\p{L}/u.test(value)) return null;
  if (/^(vir|virement|prlv|carte|cb|avoir|retrait|cheque|chq|remise)\b/.test(plainKey(value))) return null;
  return value;
}

/** Reads a BoursoBank table; null when the header is not a BoursoBank one. */
export function readBoursobank(table: string[][]): ParsedStatement | null {
  const header = table[0] ?? [];
  const index = findColumns(header, HEADERS);
  // The amount: « amount » / « montant », or the first « Solde » (the second one is the balance).
  const amountIndex = [findColumn(header, ["amount", "montant"]), findColumn(header, ["solde"])].find((column) => column >= 0) ?? -1;
  if (!index || amountIndex < 0) return null;
  const categoryIndex = findColumn(header, ["category", "categorie"]);
  const parentIndex = findColumn(header, ["categoryparent", "categorie parente", "categorie parent"]);
  const supplierIndex = findColumn(header, ["supplierfound", "libelle suggere"]);
  const accountIndex = findColumn(header, ["accountlabel", "libelle compte"]);
  // The balance: « accountbalance », or the second « Solde ».
  const lastSolde = findLastColumn(header, ["solde"]);
  const balanceIndex = findColumn(header, ["accountbalance"]) >= 0 ? findColumn(header, ["accountbalance"]) : lastSolde !== amountIndex ? lastSolde : -1;

  const rows: StatementRow[] = [];
  const errors: string[] = [];
  table.slice(1).forEach((cells, position) => {
    const line = position + 2;
    const at = (column: number) => (column >= 0 ? (cells[column] ?? "").trim() : "");
    const dateIso = parseStatementDate(at(index.date));
    const amount = parseDecimalCents(at(amountIndex));
    if (!dateIso || amount === null) {
      errors.push(`Ligne ${line} illisible (date ou montant)`);
      return;
    }
    const description = at(index.label).replace(/\s+/g, " ");
    const category = at(categoryIndex);
    const parent = at(parentIndex);
    rows.push({
      line,
      product: at(accountIndex) || BOURSOBANK_PRODUCT,
      kind: kindOf(description),
      typeLabel: description.split(" ")[0] ?? "",
      startedAt: dateIso,
      dateIso,
      description,
      merchant: merchantOf(at(supplierIndex)),
      bankCategory: [...new Set([parent, category].filter(Boolean))].join(" › ") || null,
      amountCents: amount,
      balanceCents: balanceIndex >= 0 && at(balanceIndex) !== "" ? parseDecimalCents(at(balanceIndex)) : null,
      currency: "EUR",
      state: "COMPLETED",
      stateLabel: "Passée",
    });
  });
  return { source: "BOURSOBANK", format: "boursobank", rows, errors };
}
