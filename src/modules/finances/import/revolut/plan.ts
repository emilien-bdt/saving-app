import { createHash } from "node:crypto";
import { normalizeLabel } from "../../domain/labels";
import type { LabelSuggestion } from "../../domain/suggestions";
import type { AccountType, TransactionStatus, TransactionType } from "../../domain/types";
import { type CategorySource, guessCategory, type ImportCategory } from "./categories";
import { cleanRevolutLabel } from "./labels";
import type { RevolutRow } from "./parse";

export const REVOLUT_REF_PREFIX = "revolut:";

/** Days between the bank date and a manual entry for them to be the same operation. */
export const MATCH_WINDOW_DAYS = 3;

export type ImportAccount = { id: string; name: string; type: AccountType; parentId: string | null; archived: boolean };

export type ExistingTransaction = {
  id: string;
  dateIso: string;
  dayUnknown: boolean;
  amountCents: number;
  type: TransactionType;
  status: TransactionStatus;
  accountId: string;
  toAccountId: string | null;
  label: string;
  importRef: string | null;
};

export type PlanContext = {
  userId: string;
  accounts: readonly ImportAccount[];
  /** Revolut product → account receiving its rows (null: rows ignored). */
  productAccounts: Readonly<Record<string, string | null>>;
  /** The user's transactions around the period of the file, and those carrying one of its references. */
  existing: readonly ExistingTransaction[];
  suggestions: readonly LabelSuggestion[];
  categories: readonly ImportCategory[];
};

/**
 * create: new operation; link: already typed by hand → gets the bank reference and is cleared;
 * clear: imported while pending, now completed; unchanged: already imported;
 * duplicate: already imported from another file (e.g. the savings statement).
 */
export type OperationAction = "create" | "link" | "clear" | "unchanged" | "duplicate";

export type PlannedOperation = {
  ref: string;
  lines: number[];
  dateIso: string;
  label: string;
  description: string;
  /** Positive, in cents. */
  amountCents: number;
  type: TransactionType;
  status: TransactionStatus;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  categorySource: CategorySource | null;
  action: OperationAction;
  existing: { id: string; label: string; dateIso: string; status: TransactionStatus } | null;
};

/** A pending operation imported earlier that the bank no longer shows (cancelled, or amount changed). */
export type PlannedRemoval = {
  id: string;
  dateIso: string;
  label: string;
  amountCents: number;
  type: TransactionType;
  reason: string;
};

export type SkippedRow = { line: number; dateIso: string; description: string; amountCents: number; reason: string };

export type ProductSummary = { product: string; rowCount: number; accountId: string | null };

export type RevolutImportPlan = {
  products: ProductSummary[];
  operations: PlannedOperation[];
  removals: PlannedRemoval[];
  skipped: SkippedRow[];
  /** First and last date of the file. */
  period: { from: string; to: string } | null;
};

const CURRENT_PRODUCTS = ["valeur actuelle", "current", "compte courant", "courant"];
const SAVINGS_PRODUCTS = ["depot", "deposit", "savings", "epargne", "coffre", "vault"];

const isActiveTop = (account: ImportAccount) => !account.archived && account.parentId === null;

export function defaultCheckingAccount(accounts: readonly ImportAccount[]): ImportAccount | null {
  return accounts.find((account) => isActiveTop(account) && account.type === "CHECKING") ?? null;
}

/** Accounts whose name appears in the text, longest name first. */
function mentionedAccounts(text: string, accounts: readonly ImportAccount[]): ImportAccount[] {
  const padded = ` ${normalizeLabel(text)} `;
  return accounts
    .filter((account) => !account.archived)
    .map((account) => ({ account, key: normalizeLabel(account.name) }))
    .filter(({ key }) => key.length >= 3 && padded.includes(` ${key} `))
    .sort((a, b) => b.key.length - a.key.length)
    .map(({ account }) => account);
}

/**
 * Account proposed for each product of the file: the current account for « Valeur actuelle »,
 * the savings account named in the descriptions (or the only one) for « Dépôt », a pocket of the same name otherwise.
 */
export function defaultProductAccounts(rows: readonly RevolutRow[], accounts: readonly ImportAccount[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const products = [...new Set(rows.map((row) => row.product))];
  for (const product of products) {
    const productKey = normalizeLabel(product);
    let account: ImportAccount | null = null;
    if (CURRENT_PRODUCTS.includes(productKey)) account = defaultCheckingAccount(accounts);
    else if (SAVINGS_PRODUCTS.includes(productKey)) {
      const savings = accounts.filter((candidate) => isActiveTop(candidate) && candidate.type === "SAVINGS");
      const named = new Map<string, number>();
      for (const row of rows.filter((candidate) => candidate.product === product)) {
        for (const mentioned of mentionedAccounts(row.description, savings)) named.set(mentioned.id, (named.get(mentioned.id) ?? 0) + 1);
      }
      const [best] = [...named.entries()].sort((a, b) => b[1] - a[1]);
      account = (best && savings.find((candidate) => candidate.id === best[0])) ?? (savings.length === 1 ? (savings[0] ?? null) : null);
    } else {
      account = accounts.find((candidate) => !candidate.archived && normalizeLabel(candidate.name) === productKey) ?? null;
    }
    result[product] = account?.id ?? null;
  }
  return result;
}

function makeRef(userId: string, identity: string): string {
  return REVOLUT_REF_PREFIX + createHash("sha256").update(`${userId}|${identity}`).digest("hex").slice(0, 32);
}

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

type Candidate = { row: RevolutRow; accountId: string; ref: string };

/** Builds what the import would do; nothing is written. */
export function planRevolutImport(rows: readonly RevolutRow[], context: PlanContext): RevolutImportPlan {
  const accountsById = new Map(context.accounts.map((account) => [account.id, account]));
  const byRef = new Map(context.existing.filter((item) => item.importRef).map((item) => [item.importRef as string, item]));
  const skipped: SkippedRow[] = [];
  const removals: PlannedRemoval[] = [];
  const claimed = new Set<string>();
  const occurrences = new Map<string, number>();
  const candidates: Candidate[] = [];

  const productCounts = new Map<string, number>();
  for (const row of rows) productCounts.set(row.product, (productCounts.get(row.product) ?? 0) + 1);
  const products: ProductSummary[] = [...productCounts].map(([product, rowCount]) => ({
    product,
    rowCount,
    accountId: context.productAccounts[product] ?? null,
  }));

  const skip = (row: RevolutRow, reason: string) =>
    skipped.push({ line: row.line, dateIso: row.dateIso, description: row.description, amountCents: row.amountCents, reason });

  for (const row of rows) {
    const identity = `${row.product}|${row.startedAt}|${row.description}|${row.amountCents}`;
    const occurrence = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, occurrence);
    const ref = makeRef(context.userId, `${identity}|${occurrence}`);
    const accountId = context.productAccounts[row.product] ?? null;

    if (row.currency !== "EUR") skip(row, `Devise ${row.currency} non gérée`);
    else if (!accountId || !accountsById.has(accountId)) skip(row, `Aucun compte choisi pour « ${row.product} »`);
    else if (row.kind === "INTEREST") skip(row, "Intérêts : déjà calculés par l'app");
    else if (row.state === "UNKNOWN") skip(row, `État « ${row.stateLabel} » inconnu`);
    else if (row.amountCents === 0) skip(row, "Montant nul");
    else if (row.state === "CANCELLED") {
      const existing = byRef.get(ref);
      if (existing && existing.status === "PLANNED") {
        claimed.add(existing.id);
        removals.push({
          id: existing.id,
          dateIso: existing.dateIso,
          label: existing.label,
          amountCents: existing.amountCents,
          type: existing.type,
          reason: "Annulée par la banque",
        });
      } else skip(row, `Annulée par la banque (${row.stateLabel.toLowerCase()})`);
    } else candidates.push({ row, accountId, ref });
  }

  // Internal transfers: the two sides (same time, opposite amounts) become one transfer.
  const checking = defaultCheckingAccount(context.accounts);
  const merged = new Set<Candidate>();
  type Draft = Omit<PlannedOperation, "action" | "existing">;
  const drafts: Draft[] = [];
  /** References of the rows behind each draft (two for a merged transfer). */
  const draftRefs = new Map<Draft, string[]>();
  const addDraft = (draft: Draft, refs: string[]) => {
    drafts.push(draft);
    draftRefs.set(draft, refs);
  };

  for (const candidate of candidates) {
    if (merged.has(candidate)) continue;
    const { row, accountId } = candidate;
    const own = accountsById.get(accountId);
    const pair = candidates.find(
      (other) =>
        other !== candidate &&
        !merged.has(other) &&
        other.accountId !== accountId &&
        other.row.startedAt === row.startedAt &&
        other.row.amountCents === -row.amountCents,
    );
    let counterpartId: string | null = null;
    if (pair) counterpartId = pair.accountId;
    else if (row.kind !== "CARD") {
      const mentioned = mentionedAccounts(row.description, context.accounts).find((account) => account.id !== accountId);
      if (mentioned) counterpartId = mentioned.id;
      else if (row.kind === "TRANSFER" && own?.type === "SAVINGS" && own.parentId === null && checking && checking.id !== accountId) {
        counterpartId = checking.id;
      }
    }

    const status: TransactionStatus =
      row.state === "PENDING" || pair?.row.state === "PENDING" ? "PLANNED" : "CLEARED";
    const amountCents = Math.abs(row.amountCents);

    if (counterpartId) {
      if (pair) merged.add(pair);
      const [fromId, toId] = row.amountCents < 0 ? [accountId, counterpartId] : [counterpartId, accountId];
      const from = accountsById.get(fromId)?.name ?? "?";
      const to = accountsById.get(toId)?.name ?? "?";
      addDraft({
        ref: candidate.ref,
        lines: pair ? [row.line, pair.row.line].sort((a, b) => a - b) : [row.line],
        dateIso: row.dateIso,
        label: `${from} → ${to}`,
        description: row.description,
        amountCents,
        type: "TRANSFER",
        status,
        accountId: fromId,
        toAccountId: toId,
        categoryId: null,
        categorySource: null,
      }, pair ? [candidate.ref, pair.ref] : [candidate.ref]);
      continue;
    }

    const type: TransactionType = row.amountCents < 0 ? "EXPENSE" : "INCOME";
    const label = cleanRevolutLabel(row.description);
    const guess = guessCategory(label, type === "EXPENSE" ? "EXPENSE" : "INCOME", context.suggestions, context.categories);
    addDraft({
      ref: candidate.ref,
      lines: [row.line],
      dateIso: row.dateIso,
      label,
      description: row.description,
      amountCents,
      type,
      status,
      accountId,
      toAccountId: null,
      categoryId: guess?.categoryId ?? null,
      categorySource: guess?.source ?? null,
    }, [candidate.ref]);
  }

  // 1. Same bank reference: already imported.
  const operations: PlannedOperation[] = [];
  const pending: Draft[] = [];
  for (const draft of drafts) {
    const existing = (draftRefs.get(draft) ?? []).map((ref) => byRef.get(ref)).find((item) => item && !claimed.has(item.id));
    if (!existing) {
      pending.push(draft);
      continue;
    }
    claimed.add(existing.id);
    operations.push({
      ...draft,
      ref: existing.importRef ?? draft.ref,
      action: existing.status === "PLANNED" && draft.status === "CLEARED" ? "clear" : "unchanged",
      existing: { id: existing.id, label: existing.label, dateIso: existing.dateIso, status: existing.status },
    });
  }

  // 2. Same account(s), type and amount within a few days: typed by hand (or imported from another file).
  pending.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  for (const draft of pending) {
    const day = dayNumber(draft.dateIso);
    const [match] = context.existing
      .filter(
        (item) =>
          !claimed.has(item.id) &&
          item.type === draft.type &&
          item.amountCents === draft.amountCents &&
          item.accountId === draft.accountId &&
          (item.toAccountId ?? null) === draft.toAccountId &&
          (item.dayUnknown
            ? item.dateIso.slice(0, 7) === draft.dateIso.slice(0, 7)
            : Math.abs(dayNumber(item.dateIso) - day) <= MATCH_WINDOW_DAYS),
      )
      .sort((a, b) => Math.abs(dayNumber(a.dateIso) - day) - Math.abs(dayNumber(b.dateIso) - day));
    if (match) claimed.add(match.id);
    operations.push({
      ...draft,
      action: !match ? "create" : match.importRef?.startsWith(REVOLUT_REF_PREFIX) ? "duplicate" : "link",
      existing: match ? { id: match.id, label: match.label, dateIso: match.dateIso, status: match.status } : null,
    });
  }

  // 3. Pending operations imported earlier and absent from this file (within its period, on its accounts).
  const dates = rows.map((row) => row.dateIso).sort();
  const period = dates.length > 0 ? { from: dates[0] as string, to: dates[dates.length - 1] as string } : null;
  const fileAccounts = new Set(candidates.map((candidate) => candidate.accountId));
  if (period) {
    for (const item of context.existing) {
      if (
        !claimed.has(item.id) &&
        item.status === "PLANNED" &&
        item.importRef?.startsWith(REVOLUT_REF_PREFIX) &&
        (fileAccounts.has(item.accountId) || (item.toAccountId !== null && fileAccounts.has(item.toAccountId))) &&
        item.dateIso >= period.from &&
        item.dateIso <= period.to
      ) {
        removals.push({
          id: item.id,
          dateIso: item.dateIso,
          label: item.label,
          amountCents: item.amountCents,
          type: item.type,
          reason: "N'apparaît plus dans le relevé (annulée ou montant modifié)",
        });
      }
    }
  }

  operations.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || (a.lines[0] ?? 0) - (b.lines[0] ?? 0));
  return { products, operations, removals, skipped, period };
}
