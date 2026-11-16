import type { Cents } from "@/shared/lib/money";
import { calendarDate } from "../../domain/period";
import { type AccountKey, IMPORT_ACCOUNT_KEYS } from "./mapping";
import { ImportError, parseMonthSheet } from "./parse-sheet";
import type { ImportPlan, MonthImport } from "./types";
import type { Workbook } from "./xlsx";

export type WorkbookFile = { fileName: string; workbook: Workbook };

/** "Budget-2025.xlsm" → 2025. */
export function yearFromFileName(fileName: string): number {
  const match = /budget\D{0,3}(\d{4})/i.exec(fileName) ?? /(?:^|\D)(20\d{2})(?:\D|$)/.exec(fileName);
  if (!match?.[1]) throw new ImportError(`Année introuvable dans le nom du fichier « ${fileName} » (attendu : Budget-AAAA.xlsm)`);
  return Number(match[1]);
}

const MONTH_SHEET = /^(0[1-9]|1[0-2])$/;

/**
 * Reads every monthly sheet of the files (other sheets — examples, stats,
 * 2019-2020 format — are ignored) and builds the import, in chronological order.
 */
export function buildImportPlan(files: readonly WorkbookFile[]): ImportPlan {
  const months: MonthImport[] = [];
  for (const { fileName, workbook } of files) {
    const year = yearFromFileName(fileName);
    for (const [sheetName, sheet] of workbook.sheets) {
      if (!MONTH_SHEET.test(sheetName)) continue;
      try {
        months.push(parseMonthSheet(sheet, { year, month: Number(sheetName) }, fileName, sheetName));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new ImportError(`${fileName} › onglet ${sheetName} : ${reason}`);
      }
    }
  }
  if (months.length === 0) throw new ImportError("Aucun onglet mensuel (01 à 12) trouvé");

  const monthIndex = (month: MonthImport) => month.yearMonth.year * 12 + month.yearMonth.month;
  months.sort((a, b) => monthIndex(a) - monthIndex(b));
  for (let index = 1; index < months.length; index++) {
    const previous = months[index - 1];
    const current = months[index];
    if (previous && current && monthIndex(previous) === monthIndex(current)) {
      throw new ImportError(
        `Mois ${current.sheetName}/${current.yearMonth.year} présent deux fois (${previous.fileName}, ${current.fileName})`,
      );
    }
  }

  const first = months[0];
  if (!first) throw new ImportError("Aucun mois à importer");
  const transactions = months.flatMap((month) => month.transactions);

  // Accounts existing in the first month start with its "Début" cells; the others start at 0.
  const initialBalances = Object.fromEntries(IMPORT_ACCOUNT_KEYS.map((key) => [key, 0])) as Record<AccountKey, Cents>;
  Object.assign(initialBalances, first.openingBalances);

  const used = new Set<AccountKey>(Object.keys(first.openingBalances) as AccountKey[]);
  for (const transaction of transactions) {
    used.add(transaction.accountKey);
    if (transaction.toAccountKey) used.add(transaction.toAccountKey);
  }

  return {
    months,
    transactions,
    startDate: calendarDate(first.yearMonth.year, first.yearMonth.month, 1),
    initialBalances,
    accounts: IMPORT_ACCOUNT_KEYS.filter((key) => used.has(key)),
    fileNames: [...new Set(months.map((month) => month.fileName))],
    warnings: months.flatMap((month) => month.warnings),
  };
}
