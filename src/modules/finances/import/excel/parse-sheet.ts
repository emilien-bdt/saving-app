import { type Cents, decimalToCents } from "@/shared/lib/money";
import type { DefaultCategoryKey } from "../../default-categories";
import { normalizeLabel } from "../../domain/labels";
import { calendarDate, dateForUnknownDay, lastDayOfMonth, type YearMonth } from "../../domain/period";
import { offsetColumn } from "./cells";
import { parseSumifRange, splitConstantSum } from "./formulas";
import { type AccountKey, IMPORT_ACCOUNTS, parseTransferLabel, splitLabelAndNote } from "./mapping";
import type { BalanceCheck, ImportedTransaction, MonthImport, SheetLayout } from "./types";
import type { CellValue, Sheet } from "./xlsx";

/** Expense blocks: header cell holding `SUMIF(<check>a:b,"ü",<amount>a:b)` → category. */
const EXPENSE_BLOCKS: readonly { header: string; category: DefaultCategoryKey }[] = [
  { header: "Q15", category: "LOGEMENT" },
  { header: "Q23", category: "ABONNEMENTS" },
  { header: "Q34", category: "CREDITS" },
  { header: "X2", category: "COURSES" },
  { header: "X28", category: "SORTIES" },
  { header: "AE2", category: "AUTRES" },
  { header: "AE28", category: "DEPLACEMENTS" },
];

type LayoutDefinition = {
  incomeBlocks: readonly { header: string; account: AccountKey }[];
  openingCells: readonly { cell: string; account: AccountKey }[];
  balanceChecks: readonly { cell: string; accounts: AccountKey[] }[];
};

/** The sheets changed when moving to Revolut (April / May 2026). */
const LAYOUTS: Record<SheetLayout, LayoutDefinition> = {
  // Until March 2026: Compte Courant, Livret A, Livret Jeune.
  LIVRETS: {
    incomeBlocks: [
      { header: "J2", account: "CC" },
      { header: "Q2", account: "LA" },
      { header: "Q8", account: "LJ" },
    ],
    openingCells: [
      { cell: "C6", account: "CC" },
      { cell: "C16", account: "LA" },
      { cell: "C22", account: "LJ" },
    ],
    balanceChecks: [
      { cell: "C7", accounts: ["CC"] },
      { cell: "C17", accounts: ["LA"] },
      { cell: "C23", accounts: ["LJ"] },
    ],
  },
  // April 2026: the livrets are emptied, the Livret A slot becomes "Matelas de sécurité".
  TRANSITION: {
    incomeBlocks: [
      { header: "J2", account: "CC" },
      { header: "Q2", account: "MATELAS" },
      { header: "Q8", account: "APPARTEMENT" },
    ],
    openingCells: [
      { cell: "C6", account: "CC" },
      { cell: "C16", account: "LA" },
      { cell: "C22", account: "LJ" },
    ],
    balanceChecks: [
      { cell: "C7", accounts: ["CC"] },
      { cell: "C17", accounts: ["LA", "MATELAS"] },
      { cell: "C23", accounts: ["LJ", "APPARTEMENT"] },
    ],
  },
  // From May 2026: Compte Courant, Matelas de sécurité, pockets Appartement and Voiture.
  POCKETS: {
    incomeBlocks: [
      { header: "J2", account: "CC" },
      { header: "Q2", account: "MATELAS" },
    ],
    openingCells: [
      { cell: "C6", account: "CC" },
      { cell: "C16", account: "MATELAS" },
      { cell: "C28", account: "APPARTEMENT" },
      { cell: "C34", account: "VOITURE" },
    ],
    balanceChecks: [
      { cell: "C7", accounts: ["CC"] },
      { cell: "C17", accounts: ["MATELAS"] },
      { cell: "C29", accounts: ["APPARTEMENT"] },
      { cell: "C35", accounts: ["VOITURE"] },
    ],
  },
};

const TRANSFER_ROWS = { first: 17, last: 27 } as const;
const CLEARED_MARK = "ü";

export class ImportError extends Error {}

const textOf = (value: CellValue | undefined): string => (typeof value === "string" ? value.trim() : "");

export function detectLayout(sheet: Sheet): SheetLayout {
  const b14 = normalizeLabel(textOf(sheet.get("B14")?.value));
  const b20 = normalizeLabel(textOf(sheet.get("B20")?.value));
  if (b20 === "livret jeune") return "LIVRETS";
  if (b20.startsWith("pockets")) return "POCKETS";
  if (b14.startsWith("matelas")) return "TRANSITION";
  throw new ImportError(`Mise en page inconnue (B14 = « ${b14} », B20 = « ${b20} »)`);
}

type Context = {
  sheet: Sheet;
  yearMonth: YearMonth;
  fileName: string;
  monthKey: string;
  transactions: ImportedTransaction[];
  warnings: string[];
};

function warn(context: Context, cell: string, message: string): void {
  context.warnings.push(`${context.monthKey} ${cell} : ${message}`);
}

function transactionDate(context: Context, dayCell: string): { date: Date; dayUnknown: boolean } {
  const day = context.sheet.get(dayCell)?.value;
  if (typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= lastDayOfMonth(context.yearMonth)) {
    return { date: calendarDate(context.yearMonth.year, context.yearMonth.month, day), dayUnknown: false };
  }
  if (day !== undefined && day !== null && day !== "") warn(context, dayCell, `jour « ${String(day)} » invalide, daté fin de mois`);
  return { date: dateForUnknownDay(context.yearMonth), dayUnknown: true };
}

/** Amount parts of a cell: a plain sum of constants (=a+b+c) gives one transaction per term. */
function amountParts(context: Context, ref: string): number[] | null {
  const cell = context.sheet.get(ref);
  if (!cell || cell.value === null || cell.value === "") return null;
  if (typeof cell.value !== "number") {
    warn(context, ref, `montant non numérique « ${String(cell.value)} », ligne ignorée`);
    return null;
  }
  if (!cell.formula) return [cell.value];

  const parts = splitConstantSum(cell.formula);
  if (!parts) {
    warn(context, ref, `formule « =${cell.formula} » conservée telle quelle (${cell.value})`);
    return [cell.value];
  }
  const total = parts.reduce((sum, part) => sum + part, 0);
  if (Math.abs(total - cell.value) > 0.005) {
    warn(context, ref, `formule « =${cell.formula} » incohérente avec sa valeur ${cell.value}, valeur conservée`);
    return [cell.value];
  }
  return parts;
}

function parseBlock(
  context: Context,
  header: string,
  build: (label: string) => Pick<ImportedTransaction, "type" | "accountKey" | "toAccountKey" | "categoryKey">,
): void {
  const formula = context.sheet.get(header)?.formula;
  if (!formula) return; // block absent from this layout
  const range = parseSumifRange(formula);
  if (!range) {
    warn(context, header, `en-tête de bloc illisible « =${formula} », bloc ignoré`);
    return;
  }

  const amountColumn = range.amountColumn;
  const labelColumn = offsetColumn(amountColumn, -1);
  const dayColumn = offsetColumn(amountColumn, -4);

  for (let row = range.firstRow; row <= range.lastRow; row++) {
    const ref = `${amountColumn}${row}`;
    const parts = amountParts(context, ref);
    if (!parts) continue;

    const rawLabel = textOf(context.sheet.get(`${labelColumn}${row}`)?.value);
    if (!rawLabel) warn(context, ref, "libellé vide, « Sans libellé » utilisé");
    const { label, note } = splitLabelAndNote(rawLabel || "Sans libellé");
    const status = textOf(context.sheet.get(`${range.checkColumn}${row}`)?.value) === CLEARED_MARK ? "CLEARED" : "PLANNED";
    const { date, dayUnknown } = transactionDate(context, `${dayColumn}${row}`);

    parts.forEach((part, index) => {
      const amountCents = decimalToCents(part);
      if (amountCents === 0) return;
      if (amountCents < 0) {
        warn(context, ref, `montant négatif (${part}) ignoré`);
        return;
      }
      context.transactions.push({
        importRef: `${context.monthKey}/${ref}${parts.length > 1 ? `#${index + 1}` : ""}`,
        date,
        dayUnknown,
        amountCents,
        status,
        label,
        note,
        fileName: context.fileName,
        ...build(label),
      });
    });
  }
}

function parseTransfers(context: Context): void {
  for (let row = TRANSFER_ROWS.first; row <= TRANSFER_ROWS.last; row++) {
    const labelCell = `I${row}`;
    const rawLabel = textOf(context.sheet.get(labelCell)?.value);
    const transfer = rawLabel.includes(">") ? parseTransferLabel(rawLabel) : null;
    const amountRef = `J${row}`;
    if (!transfer) {
      if (rawLabel.includes(">") && context.sheet.get(amountRef)?.value) {
        warn(context, labelCell, `virement « ${rawLabel} » non reconnu, ignoré`);
      }
      continue;
    }
    const amount = context.sheet.get(amountRef)?.value;
    if (typeof amount !== "number" || amount === 0) continue;
    if (amount < 0) {
      warn(context, amountRef, `virement négatif (${amount}) ignoré`);
      continue;
    }
    context.transactions.push({
      importRef: `${context.monthKey}/${amountRef}`,
      date: dateForUnknownDay(context.yearMonth),
      dayUnknown: true,
      amountCents: decimalToCents(amount),
      type: "TRANSFER",
      status: textOf(context.sheet.get(`K${row}`)?.value) === CLEARED_MARK ? "CLEARED" : "PLANNED",
      label: `Virement ${IMPORT_ACCOUNTS[transfer.from].name} → ${IMPORT_ACCOUNTS[transfer.to].name}`,
      note: null,
      accountKey: transfer.from,
      toAccountKey: transfer.to,
      categoryKey: null,
      fileName: context.fileName,
    });
  }
}

function excelCents(sheet: Sheet, cell: string): Cents | null {
  const value = sheet.get(cell)?.value;
  return typeof value === "number" ? decimalToCents(value) : null;
}

/** Parses one monthly sheet ("01" … "12") of a Budget-AAAA file. */
export function parseMonthSheet(sheet: Sheet, yearMonth: YearMonth, fileName: string, sheetName: string): MonthImport {
  const layout = detectLayout(sheet);
  const definition = LAYOUTS[layout];
  const context: Context = {
    sheet,
    yearMonth,
    fileName,
    monthKey: `${yearMonth.year}-${String(yearMonth.month).padStart(2, "0")}`,
    transactions: [],
    warnings: [],
  };

  for (const { header, account } of definition.incomeBlocks) {
    parseBlock(context, header, (label) => ({
      type: "INCOME",
      accountKey: account,
      toAccountKey: null,
      categoryKey: /ticket/i.test(label) ? "TICKETS_RESTAURANT" : "APPORTS",
    }));
  }
  for (const { header, category } of EXPENSE_BLOCKS) {
    parseBlock(context, header, () => ({ type: "EXPENSE", accountKey: "CC", toAccountKey: null, categoryKey: category }));
  }
  parseTransfers(context);

  const openingBalances: Partial<Record<AccountKey, Cents>> = {};
  for (const { cell, account } of definition.openingCells) {
    const cents = excelCents(sheet, cell);
    if (cents !== null) openingBalances[account] = cents;
  }

  const balanceChecks: BalanceCheck[] = [];
  for (const { cell, accounts } of definition.balanceChecks) {
    const cents = excelCents(sheet, cell);
    if (cents === null) warn(context, cell, "solde « Actuel » absent, non contrôlé");
    else balanceChecks.push({ cell, accounts, excelCents: cents });
  }

  return {
    yearMonth,
    fileName,
    sheetName,
    layout,
    transactions: context.transactions,
    openingBalances,
    balanceChecks,
    warnings: context.warnings,
  };
}
