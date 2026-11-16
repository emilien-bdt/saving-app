import type { Cents } from "@/shared/lib/money";
import type { TransactionInput } from "../schemas/transaction";
import type { LabelSuggestion } from "./suggestions";
import type { CategoryKind, TransactionStatus, TransactionType } from "./types";

/** State of the entry form (strings as typed by the user). */
export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  label: string;
  note: string;
  /** "AAAA-MM-JJ" */
  date: string;
  dayUnknown: boolean;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  status: TransactionStatus;
};

export type EditableTransaction = {
  type: TransactionType;
  amountCents: Cents;
  label: string;
  note: string | null;
  dateIso: string;
  dayUnknown: boolean;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  status: TransactionStatus;
};

/** 1250 → "12,50" (integer arithmetic, no float rounding). */
export function centsToInput(cents: Cents): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/** New entry: expense, cleared (decision of 16/11/2026), today, default account. */
export function emptyFormValues(defaults: { date: string; accountId: string }): TransactionFormValues {
  return {
    type: "EXPENSE",
    amount: "",
    label: "",
    note: "",
    date: defaults.date,
    dayUnknown: false,
    accountId: defaults.accountId,
    toAccountId: null,
    categoryId: null,
    status: "CLEARED",
  };
}

export function formValuesFromTransaction(transaction: EditableTransaction): TransactionFormValues {
  return {
    type: transaction.type,
    amount: centsToInput(transaction.amountCents),
    label: transaction.label,
    note: transaction.note ?? "",
    date: transaction.dateIso,
    dayUnknown: transaction.dayUnknown,
    accountId: transaction.accountId,
    toAccountId: transaction.toAccountId,
    categoryId: transaction.categoryId,
    status: transaction.status,
  };
}

/** Switching type drops what no longer fits (category of the other kind, destination account). */
export function changeType(
  values: TransactionFormValues,
  type: TransactionType,
  categoryKind: (categoryId: string) => CategoryKind | undefined,
): TransactionFormValues {
  const categoryFits = values.categoryId !== null && categoryKind(values.categoryId) === type;
  return {
    ...values,
    type,
    categoryId: type !== "TRANSFER" && categoryFits ? values.categoryId : null,
    toAccountId: type === "TRANSFER" ? values.toAccountId : null,
  };
}

/** Picking a known label also picks its usual type and category, unless the user chose a category. */
export function applySuggestion(
  values: TransactionFormValues,
  suggestion: LabelSuggestion,
  categoryChosenByUser: boolean,
): TransactionFormValues {
  if (categoryChosenByUser || suggestion.type === "TRANSFER") return { ...values, label: suggestion.label };
  return { ...values, label: suggestion.label, type: suggestion.type, categoryId: suggestion.categoryId, toAccountId: null };
}

/** Changing the date of an Excel row "sans jour" gives it a real day. */
export function changeDate(values: TransactionFormValues, date: string): TransactionFormValues {
  return { ...values, date, dayUnknown: values.dayUnknown && date === values.date };
}

/** "Ajouter et continuer": keeps the context (type, date, account, status), clears the rest. */
export function valuesForNextEntry(values: TransactionFormValues): TransactionFormValues {
  return { ...values, amount: "", label: "", note: "", categoryId: null };
}

/** Form values → input of the save action (validated again on the server). */
export function formValuesToInput(values: TransactionFormValues): TransactionInput {
  const isTransfer = values.type === "TRANSFER";
  return {
    date: values.date,
    dayUnknown: values.dayUnknown,
    amount: values.amount,
    type: values.type,
    status: values.status,
    label: values.label,
    note: values.note.trim() ? values.note : null,
    accountId: values.accountId,
    toAccountId: isTransfer ? values.toAccountId : null,
    categoryId: isTransfer ? null : values.categoryId,
  };
}
