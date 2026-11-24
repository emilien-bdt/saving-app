import { requireSession } from "@/shared/auth/server";
import { db } from "@/shared/lib/db";
import { normalizeLabel } from "../domain/labels";
import { BANK_REF_PREFIXES, type BankImportPlan, type ExistingTransaction, type PlanContext } from "../import/bank/plan";
import type { BankSource, StatementRow } from "../import/bank/statement";
import { getTransactionFormOptions } from "./form-options";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const shiftDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000);

/** Everything the plan needs: accounts, categories, label history and the transactions around the period of the file. */
export async function loadBankPlanContext(
  rows: readonly StatementRow[],
  source: BankSource,
  productAccounts: Record<string, string | null>,
  fromDate: string | null,
): Promise<PlanContext> {
  const { userId } = await requireSession();
  const [{ accounts, categories, suggestions }, openings] = await Promise.all([
    getTransactionFormOptions(),
    db.account.findMany({ where: { userId }, select: { id: true, initialBalanceDate: true } }),
  ]);
  const opened = new Map(openings.map((account) => [account.id, isoDate(account.initialBalanceDate)]));
  const dates = rows.map((row) => row.dateIso).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];

  let existing: ExistingTransaction[] = [];
  if (first && last) {
    // A month before: entries « sans jour » are dated on the last day of their month.
    const transactions = await db.transaction.findMany({
      where: { userId, date: { gte: shiftDays(first, -31), lte: shiftDays(last, 31) } },
      select: {
        id: true,
        date: true,
        dayUnknown: true,
        amountCents: true,
        type: true,
        status: true,
        accountId: true,
        toAccountId: true,
        label: true,
        importRef: true,
      },
    });
    existing = transactions.map(({ date, ...transaction }) => ({ ...transaction, dateIso: isoDate(date) }));
  }

  return {
    userId,
    source,
    fromDate,
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      parentId: account.parentId,
      archived: account.archived,
      openedIso: opened.get(account.id) ?? null,
    })),
    productAccounts,
    existing,
    suggestions,
    categories: categories
      .filter((category) => !category.hasChildren)
      .map((category) => ({ id: category.id, name: category.name, kind: category.kind, archived: category.archived })),
  };
}

export type BankImportDecisions = {
  /** References of the operations the user unticked. */
  skippedRefs: ReadonlySet<string>;
  /** Category chosen in the preview, by reference. */
  categories: ReadonlyMap<string, string>;
  /** Removals the user unticked (the operation is kept). */
  keptIds: ReadonlySet<string>;
};

export type BankImportResult = { created: number; linked: number; cleared: number; removed: number };

export class BankImportError extends Error {}

/** Writes the plan in one database transaction (new operations in one import batch, which can be undone). */
export async function applyBankPlan(
  plan: BankImportPlan,
  decisions: BankImportDecisions,
  fileName: string,
): Promise<BankImportResult> {
  const { userId } = await requireSession();
  const categories = await db.category.findMany({
    where: { userId, archivedAt: null, children: { none: {} } },
    select: { id: true, kind: true },
  });
  const categoryKinds = new Map(categories.map((category) => [category.id, category.kind]));

  const chosen = plan.operations.filter((operation) => !decisions.skippedRefs.has(operation.ref));
  const creates = chosen
    .filter((operation) => operation.action === "create")
    .map((operation) => {
      if (operation.type === "TRANSFER") return { ...operation, categoryId: null };
      const categoryId = decisions.categories.get(operation.ref) ?? operation.categoryId;
      if (!categoryId || categoryKinds.get(categoryId) !== operation.type) {
        throw new BankImportError(`Choisis une catégorie pour « ${operation.label} » du ${operation.dateIso.split("-").reverse().join("/")}`);
      }
      return { ...operation, categoryId };
    });
  const links = chosen.filter((operation) => operation.action === "link" || operation.action === "clear");
  const removals = plan.removals.filter((removal) => !decisions.keptIds.has(removal.id));

  return db.$transaction(
    async (tx) => {
      if (creates.length > 0) {
        const batch = await tx.importBatch.create({
          data: { userId, fileName, source: plan.source, rowCount: creates.length },
        });
        await tx.transaction.createMany({
          data: creates.map((operation) => ({
            userId,
            date: new Date(`${operation.dateIso}T00:00:00Z`),
            amountCents: operation.amountCents,
            type: operation.type,
            status: operation.status,
            label: operation.label,
            labelKey: normalizeLabel(operation.label),
            accountId: operation.accountId,
            toAccountId: operation.toAccountId,
            categoryId: operation.categoryId,
            importBatchId: batch.id,
            importRef: operation.ref,
          })),
        });
      }

      // Recognised entries keep their label, category and note; they take the bank date, reference and status.
      let linked = 0;
      let cleared = 0;
      for (const operation of links) {
        if (!operation.existing) continue;
        const { count } = await tx.transaction.updateMany({
          where: { id: operation.existing.id, userId },
          data: {
            importRef: operation.ref,
            status: operation.status,
            date: new Date(`${operation.dateIso}T00:00:00Z`),
            dayUnknown: false,
          },
        });
        if (operation.action === "link") linked += count;
        else cleared += count;
      }

      const { count: removed } =
        removals.length > 0
          ? await tx.transaction.deleteMany({
              where: {
                id: { in: removals.map((removal) => removal.id) },
                userId,
                status: "PLANNED",
                OR: Object.values(BANK_REF_PREFIXES).map((prefix) => ({ importRef: { startsWith: prefix } })),
              },
            })
          : { count: 0 };

      return { created: creates.length, linked, cleared, removed };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}

export type BankImportBatch = { id: string; fileName: string; importedAtIso: string; rowCount: number; remaining: number };

/** The last bank statement imports (the Excel ones are not undone from the app). */
export async function listBankImports(limit = 10): Promise<BankImportBatch[]> {
  const { userId } = await requireSession();
  const batches = await db.importBatch.findMany({
    where: { userId, source: { not: "EXCEL" } },
    orderBy: { importedAt: "desc" },
    take: limit,
    select: { id: true, fileName: true, importedAt: true, rowCount: true, _count: { select: { transactions: true } } },
  });
  return batches.map((batch) => ({
    id: batch.id,
    fileName: batch.fileName,
    importedAtIso: batch.importedAt.toISOString(),
    rowCount: batch.rowCount,
    remaining: batch._count.transactions,
  }));
}

/** Deletes a bank statement import and the operations it created. Returns false when it no longer exists. */
export async function deleteBankImport(id: string): Promise<boolean> {
  const { userId } = await requireSession();
  const { count } = await db.importBatch.deleteMany({ where: { id, userId, source: { not: "EXCEL" } } });
  return count > 0;
}
