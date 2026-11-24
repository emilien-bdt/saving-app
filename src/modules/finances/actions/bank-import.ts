"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import {
  applyBankPlan,
  BankImportError,
  type BankImportResult,
  deleteBankImport,
  loadBankPlanContext,
} from "../data/bank-import";
import { parseBankStatement } from "../import/bank/parse";
import { type BankImportPlan, defaultProductAccounts, planBankImport } from "../import/bank/plan";
import { type StatementFormat, StatementError } from "../import/bank/statement";

export type BankPreview = BankImportPlan & {
  format: StatementFormat;
  /** Unreadable lines. */
  errors: string[];
  productAccounts: Record<string, string | null>;
  fromDate: string | null;
  rebaseAccountIds: string[];
};

type Failure = { ok: false; error: string };
const failure = (error: string): Failure => ({ ok: false, error });

const id = z.string().min(1).max(64);
const fileSchema = z.object({
  /** Content of the CSV, read in the browser. */
  csv: z.string().min(1, "Le fichier est vide").max(3_000_000, "Fichier trop gros (3 Mo maximum)"),
  fileName: z.string().trim().min(1).max(200),
  /** Account chosen for each product of the bank; missing → proposed by the app. */
  productAccounts: z.record(z.string().max(100), id.nullable()).optional(),
  /** Rows before this date are ignored. */
  fromDate: z.iso.date().nullish(),
  /** Accounts whose history before their opening in Save is imported too. */
  rebaseAccountIds: z.array(id).max(50).optional(),
});

const applySchema = fileSchema.extend({
  skippedRefs: z.array(z.string().max(80)).max(20_000),
  categories: z.record(z.string().max(80), id),
  keptRemovalIds: z.array(id).max(20_000),
});

export type BankFileInput = z.input<typeof fileSchema>;
export type BankApplyInput = z.input<typeof applySchema>;

async function buildPreview(input: z.output<typeof fileSchema>): Promise<BankPreview> {
  const { source, format, rows, errors } = parseBankStatement(input.csv);
  const fromDate = input.fromDate ?? null;
  const context = await loadBankPlanContext(rows, source, {}, fromDate);
  const active = context.accounts.filter((account) => !account.archived);
  const activeIds = new Set(active.map((account) => account.id));
  const rebaseAccountIds = (input.rebaseAccountIds ?? []).filter((accountId) => activeIds.has(accountId));
  const proposed = defaultProductAccounts(rows, active, source);
  const productAccounts = { ...proposed };
  for (const product of Object.keys(proposed)) {
    const chosen = input.productAccounts?.[product];
    if (chosen !== undefined) productAccounts[product] = chosen !== null && activeIds.has(chosen) ? chosen : null;
  }
  const plan = planBankImport(rows, { ...context, productAccounts, rebaseAccountIds: new Set(rebaseAccountIds) });
  return { ...plan, format, errors, productAccounts, fromDate, rebaseAccountIds };
}

/** Reads the statement and says what the import would do (nothing is written). */
export async function previewBankImport(input: BankFileInput): Promise<{ ok: true; preview: BankPreview } | Failure> {
  await requireSession();
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Fichier invalide");
  try {
    return { ok: true, preview: await buildPreview(parsed.data) };
  } catch (error) {
    if (error instanceof StatementError) return failure(error.message);
    throw error;
  }
}

/** Imports the statement with the choices made in the preview (the plan is rebuilt on the server). */
export async function applyBankImport(input: BankApplyInput): Promise<{ ok: true; result: BankImportResult } | Failure> {
  await requireSession();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Requête invalide");
  const data = parsed.data;
  try {
    const plan = await buildPreview(data);
    const result = await applyBankPlan(
      plan,
      {
        skippedRefs: new Set(data.skippedRefs),
        categories: new Map(Object.entries(data.categories)),
        keptIds: new Set(data.keptRemovalIds),
      },
      data.fileName,
    );
    revalidatePath("/finances", "layout");
    return { ok: true, result };
  } catch (error) {
    if (error instanceof StatementError || error instanceof BankImportError) return failure(error.message);
    throw error;
  }
}

/** Undoes an import: deletes the operations it created. */
export async function undoBankImport(batchId: string): Promise<{ ok: true } | Failure> {
  await requireSession();
  const parsed = id.safeParse(batchId);
  if (!parsed.success || !(await deleteBankImport(parsed.data))) return failure("Cet import n'existe plus");
  revalidatePath("/finances", "layout");
  return { ok: true };
}
