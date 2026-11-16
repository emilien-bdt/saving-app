import type { Cents } from "@/shared/lib/money";
import type { DefaultCategoryKey } from "../../default-categories";
import type { YearMonth } from "../../domain/period";
import type { TransactionStatus, TransactionType } from "../../domain/types";
import type { AccountKey } from "./mapping";

export type ImportedTransaction = {
  /** "2025-03/X30#2": month / cell / part of a split formula. Unique, makes re-imports idempotent. */
  importRef: string;
  date: Date;
  dayUnknown: boolean;
  amountCents: Cents;
  type: TransactionType;
  status: TransactionStatus;
  label: string;
  note: string | null;
  accountKey: AccountKey;
  toAccountKey: AccountKey | null;
  categoryKey: DefaultCategoryKey | null;
  fileName: string;
};

/** Excel balance cell ("Actuel") to compare with the recomputed balance of these accounts. */
export type BalanceCheck = { cell: string; accounts: AccountKey[]; excelCents: Cents };

export type SheetLayout = "LIVRETS" | "TRANSITION" | "POCKETS";

export type MonthImport = {
  yearMonth: YearMonth;
  fileName: string;
  sheetName: string;
  layout: SheetLayout;
  transactions: ImportedTransaction[];
  /** "Début" cells of the month. */
  openingBalances: Partial<Record<AccountKey, Cents>>;
  balanceChecks: BalanceCheck[];
  warnings: string[];
};

export type ImportPlan = {
  months: MonthImport[];
  transactions: ImportedTransaction[];
  /** First day of the first imported month: initial balance date of every account. */
  startDate: Date;
  initialBalances: Record<AccountKey, Cents>;
  /** Accounts to create / update, parents first. */
  accounts: AccountKey[];
  fileNames: string[];
  warnings: string[];
};
