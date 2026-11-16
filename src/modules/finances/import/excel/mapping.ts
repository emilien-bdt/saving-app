import { normalizeLabel } from "../../domain/labels";
import type { AccountType } from "../../domain/types";

/** Accounts found in the Excel files (2024 → 2026). */
export const IMPORT_ACCOUNT_KEYS = ["CC", "LA", "LJ", "MATELAS", "APPARTEMENT", "VOITURE"] as const;
export type AccountKey = (typeof IMPORT_ACCOUNT_KEYS)[number];

export type ImportAccount = {
  name: string;
  type: AccountType;
  /** Pockets (Revolut) belong to the current account. */
  parentKey: AccountKey | null;
  /** Closed in April 2026 (move to Revolut): created archived. */
  closed: boolean;
  color: string;
  icon: string;
};

/** Parents come before their pockets. */
export const IMPORT_ACCOUNTS: Record<AccountKey, ImportAccount> = {
  CC: { name: "Compte Courant", type: "CHECKING", parentKey: null, closed: false, color: "#2563eb", icon: "wallet" },
  LA: { name: "Livret A", type: "SAVINGS", parentKey: null, closed: true, color: "#16a34a", icon: "piggy-bank" },
  LJ: { name: "Livret Jeune", type: "SAVINGS", parentKey: null, closed: true, color: "#0d9488", icon: "piggy-bank" },
  MATELAS: { name: "Matelas de sécurité", type: "SAVINGS", parentKey: null, closed: false, color: "#15803d", icon: "shield" },
  APPARTEMENT: { name: "Appartement", type: "SAVINGS", parentKey: "CC", closed: false, color: "#9333ea", icon: "house" },
  VOITURE: { name: "Voiture", type: "SAVINGS", parentKey: "CC", closed: false, color: "#0891b2", icon: "car" },
};

const ACCOUNT_ALIASES: readonly [RegExp, AccountKey][] = [
  [/^compte courant\b/, "CC"], // "Compte Courant", "Compte Courant Rev", "Compte Courant CA"
  [/^livret a$/, "LA"],
  [/^livret jeune$/, "LJ"],
  [/^matelas\b/, "MATELAS"], // includes the "Matelas de séurité" typo
  [/^appartement$/, "APPARTEMENT"],
  [/^voiture$/, "VOITURE"],
];

export function accountKeyFromName(name: string): AccountKey | null {
  const normalized = normalizeLabel(name);
  return ACCOUNT_ALIASES.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

/** "Compte Courant --> Livret A" / "Voiture -> Appartement" → source and destination accounts. */
export function parseTransferLabel(label: string): { from: AccountKey; to: AccountKey } | null {
  const match = /^(.+?)\s*-+>\s*(.+)$/.exec(label.trim());
  if (!match?.[1] || !match[2]) return null;
  const from = accountKeyFromName(match[1]);
  const to = accountKeyFromName(match[2]);
  return from && to && from !== to ? { from, to } : null;
}

/** "Auchan - Herouville(Crêpes)" → label "Auchan - Herouville", note "Crêpes". */
export function splitLabelAndNote(raw: string): { label: string; note: string | null } {
  const text = raw.replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\(([^()]*)\)$/.exec(text);
  const label = match?.[1]?.trim();
  const note = match?.[2]?.trim();
  return label && note ? { label, note } : { label: text, note: null };
}
