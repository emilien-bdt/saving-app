import type { LabelSuggestion } from "./domain/suggestions";
import type { ListTransaction } from "./domain/transaction-list";
import type { AccountType, CategoryKind } from "./domain/types";

/** Serializable data passed from the server pages to the client components. */

export type TransactionItem = ListTransaction & {
  note: string | null;
  accountId: string;
  toAccountId: string | null;
};

export type AccountOption = {
  id: string;
  name: string;
  /** "Compte Courant › Voiture" for a pocket. */
  displayName: string;
  type: AccountType;
  parentId: string | null;
  archived: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string | null;
  parentId: string | null;
  parentName: string | null;
  archived: boolean;
  hasChildren: boolean;
  usageCount: number;
};

export type TransactionFormOptions = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  suggestions: LabelSuggestion[];
  defaultAccountId: string | null;
};
