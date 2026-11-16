import { normalizeLabel } from "./labels";
import { TRANSACTION_STATUSES, type TransactionStatus } from "./types";

export type TransactionFilters = {
  accountId: string | null;
  categoryId: string | null;
  status: TransactionStatus | null;
  query: string | null;
};

export type TransactionView = "detailed" | "grouped";

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

function id(value: string | string[] | undefined): string | null {
  const raw = first(value)?.trim();
  return raw && /^[\w-]{1,64}$/.test(raw) ? raw : null;
}

/** Reads the list filters from the URL (?compte=…&categorie=…&statut=prevue|pointee&q=…). */
export function parseTransactionFilters(params: Params): TransactionFilters {
  const status = first(params.statut);
  const query = first(params.q)?.trim().slice(0, 100);
  return {
    accountId: id(params.compte),
    categoryId: id(params.categorie),
    status: status === "prevue" ? "PLANNED" : status === "pointee" ? "CLEARED" : null,
    query: query ? query : null,
  };
}

export function statusParam(status: TransactionStatus): string {
  return status === "PLANNED" ? "prevue" : "pointee";
}

/** ?vue=groupee|detaillee, else the remembered choice (cookie), else detailed. */
export function parseView(param: string | string[] | undefined, remembered: string | undefined): TransactionView {
  const value = first(param) ?? remembered;
  return value === "groupee" ? "grouped" : "detailed";
}

export const VIEW_COOKIE = "finances_vue";

export const isTransactionStatus = (value: string): value is TransactionStatus =>
  (TRANSACTION_STATUSES as readonly string[]).includes(value);

/** Same filters as the database query, for rows computed by the app (interest). */
export function matchesListFilters(
  item: { accountId: string; toAccountId: string | null; categoryId: string | null; status: TransactionStatus; label: string; note: string | null },
  filters: TransactionFilters,
): boolean {
  if (filters.accountId && item.accountId !== filters.accountId && item.toAccountId !== filters.accountId) return false;
  if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.query) {
    const query = normalizeLabel(filters.query);
    if (![item.label, item.note ?? ""].some((text) => normalizeLabel(text).includes(query))) return false;
  }
  return true;
}
