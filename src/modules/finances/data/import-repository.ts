import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/shared/lib/db";
import { DEFAULT_CATEGORIES, type DefaultCategoryKey } from "../default-categories";
import { normalizeLabel } from "../domain/labels";
import { type AccountKey, IMPORT_ACCOUNT_KEYS, IMPORT_ACCOUNTS } from "../import/excel/mapping";
import type { ImportPlan } from "../import/excel/types";

type TransactionClient = Prisma.TransactionClient;

export type ImportResult = {
  created: number;
  alreadyImported: number;
  files: { fileName: string; created: number }[];
};

/** Creates the missing accounts (pockets under their parent) and sets their initial balance. */
async function ensureAccounts(tx: TransactionClient, plan: ImportPlan): Promise<Record<AccountKey, string>> {
  const ids: Partial<Record<AccountKey, string>> = {};
  for (const key of plan.accounts) {
    const definition = IMPORT_ACCOUNTS[key];
    const parentId = definition.parentKey ? (ids[definition.parentKey] ?? null) : null;
    if (definition.parentKey && !parentId) {
      throw new Error(`Compte parent « ${IMPORT_ACCOUNTS[definition.parentKey].name} » absent de l'import`);
    }
    const balance = { initialBalanceCents: plan.initialBalances[key], initialBalanceDate: plan.startDate };
    const existing = await tx.account.findFirst({ where: { name: definition.name } });

    if (existing) {
      await tx.account.update({
        where: { id: existing.id },
        data: { ...balance, archivedAt: definition.closed ? (existing.archivedAt ?? new Date()) : existing.archivedAt },
      });
      ids[key] = existing.id;
    } else {
      const created = await tx.account.create({
        data: {
          ...balance,
          name: definition.name,
          type: definition.type,
          color: definition.color,
          icon: definition.icon,
          parentId,
          sortOrder: IMPORT_ACCOUNT_KEYS.indexOf(key),
          archivedAt: definition.closed ? new Date() : null,
        },
      });
      ids[key] = created.id;
    }
  }
  return ids as Record<AccountKey, string>;
}

async function loadCategoryIds(tx: TransactionClient): Promise<Record<DefaultCategoryKey, string>> {
  const categories = await tx.category.findMany({ select: { id: true, name: true, kind: true } });
  const ids: Partial<Record<DefaultCategoryKey, string>> = {};
  for (const definition of DEFAULT_CATEGORIES) {
    const match = categories.find((category) => category.name === definition.name && category.kind === definition.kind);
    if (!match) {
      throw new Error(`Catégorie « ${definition.name} » introuvable : lance d'abord \`npm run db:seed\``);
    }
    ids[definition.key] = match.id;
  }
  return ids as Record<DefaultCategoryKey, string>;
}

/** Deletes every import batch, hence every imported transaction (cascade). Manual entries are kept. */
export async function deleteAllImports(): Promise<number> {
  const { count } = await db.transaction.deleteMany({ where: { importBatchId: { not: null } } });
  await db.importBatch.deleteMany({});
  return count;
}

/**
 * Writes the plan in one database transaction. Rows already imported
 * (same importRef) are skipped: running the import twice changes nothing.
 * One ImportBatch per file; deleting it undoes that file's import.
 */
export async function applyImportPlan(plan: ImportPlan): Promise<ImportResult> {
  return db.$transaction(
    async (tx) => {
      const accountIds = await ensureAccounts(tx, plan);
      const categoryIds = await loadCategoryIds(tx);
      const files: ImportResult["files"] = [];

      for (const fileName of plan.fileNames) {
        const rows = plan.transactions.filter((transaction) => transaction.fileName === fileName);
        const existing = await tx.transaction.findMany({
          where: { importRef: { in: rows.map((row) => row.importRef) } },
          select: { importRef: true },
        });
        const known = new Set(existing.map((row) => row.importRef));
        const fresh = rows.filter((row) => !known.has(row.importRef));
        if (fresh.length === 0) {
          files.push({ fileName, created: 0 });
          continue;
        }

        const batch = await tx.importBatch.create({ data: { fileName, rowCount: fresh.length } });
        await tx.transaction.createMany({
          data: fresh.map((row) => ({
            date: row.date,
            dayUnknown: row.dayUnknown,
            amountCents: row.amountCents,
            type: row.type,
            status: row.status,
            label: row.label,
            labelKey: normalizeLabel(row.label),
            note: row.note,
            accountId: accountIds[row.accountKey],
            toAccountId: row.toAccountKey ? accountIds[row.toAccountKey] : null,
            categoryId: row.categoryKey ? categoryIds[row.categoryKey] : null,
            importBatchId: batch.id,
            importRef: row.importRef,
          })),
        });
        files.push({ fileName, created: fresh.length });
      }

      const created = files.reduce((sum, file) => sum + file.created, 0);
      return { created, alreadyImported: plan.transactions.length - created, files };
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
}
