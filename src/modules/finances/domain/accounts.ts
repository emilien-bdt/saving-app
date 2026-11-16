import { normalizeLabel } from "./labels";
import type { AccountType } from "./types";

/** How accounts are shown and totalled: pockets are counted apart from current and savings accounts. */
export const ACCOUNT_GROUPS = ["CHECKING", "SAVINGS", "POCKETS"] as const;
export type AccountGroup = (typeof ACCOUNT_GROUPS)[number];

export const ACCOUNT_GROUP_LABELS: Record<AccountGroup, string> = {
  CHECKING: "Courant",
  SAVINGS: "Épargne",
  POCKETS: "Pockets",
};

export function accountGroupOf(account: { type: AccountType; parentId: string | null }): AccountGroup {
  if (account.parentId) return "POCKETS";
  return account.type === "SAVINGS" ? "SAVINGS" : "CHECKING";
}

/** What the rules need to know about an existing account. */
export type AccountState = {
  id: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  archived: boolean;
  sortOrder: number;
  /** Transactions (both sides of transfers) and recurring rules using the account. */
  usageCount: number;
};

export type AccountIssue = { field: string; message: string };

/** Creation (id = null) or update of an account / pocket. */
export function checkAccountSave(
  input: { id: string | null; name: string; parentId: string | null },
  accounts: readonly AccountState[],
): AccountIssue[] {
  const issues: AccountIssue[] = [];
  const existing = input.id ? accounts.find((account) => account.id === input.id) : undefined;
  if (input.id && !existing) return [{ field: "form", message: "Ce compte n'existe plus" }];

  if (input.parentId) {
    const parent = accounts.find((account) => account.id === input.parentId);
    if (!parent || parent.id === input.id) issues.push({ field: "parentId", message: "Compte parent introuvable" });
    else if (parent.parentId) issues.push({ field: "parentId", message: "Un pocket ne peut pas contenir de pocket" });
    else if (parent.archived && existing?.parentId !== parent.id) {
      issues.push({ field: "parentId", message: "Ce compte est archivé" });
    }
    if (existing && accounts.some((account) => account.parentId === existing.id)) {
      issues.push({ field: "parentId", message: "Ce compte a des pockets : il ne peut pas devenir un pocket" });
    }
  }

  const key = normalizeLabel(input.name);
  const duplicate = accounts.some(
    (account) => account.id !== input.id && account.parentId === input.parentId && normalizeLabel(account.name) === key,
  );
  if (duplicate) issues.push({ field: "name", message: "Ce nom est déjà utilisé" });
  return issues;
}

/** null = allowed. */
export function checkArchive(id: string, accounts: readonly AccountState[]): string | null {
  if (!accounts.some((account) => account.id === id)) return "Ce compte n'existe plus";
  const activePockets = accounts.filter((account) => account.parentId === id && !account.archived);
  if (activePockets.length > 0) {
    return `Archive d'abord ses pockets (${activePockets.map((pocket) => pocket.name).join(", ")})`;
  }
  return null;
}

export function checkUnarchive(id: string, accounts: readonly AccountState[]): string | null {
  const account = accounts.find((candidate) => candidate.id === id);
  if (!account) return "Ce compte n'existe plus";
  const parent = account.parentId ? accounts.find((candidate) => candidate.id === account.parentId) : undefined;
  if (parent?.archived) return `Désarchive d'abord ${parent.name}`;
  return null;
}

/** A used account is archived, never deleted (its history stays). */
export function checkDelete(id: string, accounts: readonly AccountState[]): string | null {
  const account = accounts.find((candidate) => candidate.id === id);
  if (!account) return "Ce compte n'existe plus";
  if (account.usageCount > 0) return "Ce compte a des opérations : archive-le plutôt";
  if (accounts.some((candidate) => candidate.parentId === id)) return "Supprime d'abord ses pockets";
  return null;
}

export const canDeleteAccount = (id: string, accounts: readonly AccountState[]) => checkDelete(id, accounts) === null;

const bySortOrder = (a: AccountState, b: AccountState) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "fr");

/** Same block on screen: same parent (pockets) or same type (top-level), active accounts only. */
function siblingsOf(account: AccountState, accounts: readonly AccountState[]): AccountState[] {
  return accounts
    .filter(
      (candidate) =>
        !candidate.archived &&
        candidate.parentId === account.parentId &&
        (account.parentId !== null || candidate.type === account.type),
    )
    .sort(bySortOrder);
}

/**
 * Moves an account one place up (-1) or down (+1) among its siblings.
 * Returns the sort orders to write (siblings renumbered 0..n-1), [] when nothing moves, null if unknown.
 */
export function moveAccount(
  id: string,
  direction: -1 | 1,
  accounts: readonly AccountState[],
): { id: string; sortOrder: number }[] | null {
  const account = accounts.find((candidate) => candidate.id === id);
  if (!account) return null;
  const siblings = siblingsOf(account, accounts);
  const index = siblings.findIndex((candidate) => candidate.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= siblings.length) return [];
  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target] as AccountState, reordered[index] as AccountState];
  return reordered
    .map((candidate, sortOrder) => ({ id: candidate.id, sortOrder, before: candidate.sortOrder }))
    .filter((update) => update.sortOrder !== update.before)
    .map(({ id: updateId, sortOrder }) => ({ id: updateId, sortOrder }));
}

/** Sort order of a new account: after its future siblings. */
export function nextSortOrder(account: { type: AccountType; parentId: string | null }, accounts: readonly AccountState[]): number {
  const siblings = accounts.filter(
    (candidate) => candidate.parentId === account.parentId && (account.parentId !== null || candidate.type === account.type),
  );
  return siblings.reduce((max, candidate) => Math.max(max, candidate.sortOrder + 1), 0);
}
