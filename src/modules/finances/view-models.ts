import type { AccountGroup } from "./domain/accounts";
import type { LabelSuggestion } from "./domain/suggestions";
import type { ListTransaction } from "./domain/transaction-list";
import type { AccountType, CategoryKind } from "./domain/types";

/** Serializable data passed from the server pages to the client components. */

export type TransactionItem = ListTransaction & {
  note: string | null;
  accountId: string;
  toAccountId: string | null;
  /** Computed by the app (daily interest): read-only, not stored. */
  computed?: boolean;
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
  /** Daily interest rates (savings accounts), oldest first. */
  interestRates: { id: string; validFromIso: string; rateBp: number }[];
  /** Rate applying today (0 without rate). */
  currentRateBp: number;
};
