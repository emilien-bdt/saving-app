import type { AccountGroup } from "./domain/accounts";
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

export type AccountSettingsItem = {
  id: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  parentName: string | null;
  color: string;
  icon: string | null;
  archived: boolean;
  group: AccountGroup;
  /** Transactions and recurring rules using the account. */
  usageCount: number;
  canDelete: boolean;
};
