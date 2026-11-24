"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import {
  applyRevolutPlan,
  deleteRevolutImport,
  loadRevolutPlanContext,
  RevolutImportError,
  type RevolutImportResult,
} from "../data/revolut-import";
import { parseRevolutStatement, type RevolutFormat, StatementError } from "../import/revolut/parse";
import { defaultProductAccounts, planRevolutImport, type RevolutImportPlan } from "../import/revolut/plan";

export type RevolutPreview = RevolutImportPlan & {
  format: RevolutFormat;
  /** Unreadable lines. */
  errors: string[];
  productAccounts: Record<string, string | null>;
};

type Failure = { ok: false; error: string };
const failure = (error: string): Failure => ({ ok: false, error });

const id = z.string().min(1).max(64);
const fileSchema = z.object({
  /** Content of the CSV, read in the browser. */
  csv: z.string().min(1, "Le fichier est vide").max(3_000_000, "Fichier trop gros (3 Mo maximum)"),
  fileName: z.string().trim().min(1).max(200),
  /** Account chosen for each Revolut product; missing → proposed by the app. */
  productAccounts: z.record(z.string().max(100), id.nullable()).optional(),
});

const applySchema = fileSchema.extend({
  skippedRefs: z.array(z.string().max(80)).max(20_000),
  categories: z.record(z.string().max(80), id),
  keptRemovalIds: z.array(id).max(20_000),
});

export type RevolutFileInput = z.input<typeof fileSchema>;
export type RevolutApplyInput = z.input<typeof applySchema>;

async function buildPreview(input: z.output<typeof fileSchema>): Promise<RevolutPreview> {
  const { format, rows, errors } = parseRevolutStatement(input.csv);
  const context = await loadRevolutPlanContext(rows, {});
  const active = context.accounts.filter((account) => !account.archived);
  const activeIds = new Set(active.map((account) => account.id));
  const proposed = defaultProductAccounts(rows, active);
  const productAccounts = { ...proposed };
  for (const product of Object.keys(proposed)) {
    const chosen = input.productAccounts?.[product];
    if (chosen !== undefined) productAccounts[product] = chosen !== null && activeIds.has(chosen) ? chosen : null;
  }
  const plan = planRevolutImport(rows, { ...context, productAccounts });
  return { ...plan, format, errors, productAccounts };
}

/** Reads the statement and says what the import would do (nothing is written). */
export async function previewRevolutImport(input: RevolutFileInput): Promise<{ ok: true; preview: RevolutPreview } | Failure> {
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
export async function applyRevolutImport(input: RevolutApplyInput): Promise<{ ok: true; result: RevolutImportResult } | Failure> {
  await requireSession();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Requête invalide");
  const data = parsed.data;
  try {
    const plan = await buildPreview(data);
    const result = await applyRevolutPlan(
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
    if (error instanceof StatementError || error instanceof RevolutImportError) return failure(error.message);
    throw error;
  }
}

/** Undoes an import: deletes the operations it created. */
export async function undoRevolutImport(batchId: string): Promise<{ ok: true } | Failure> {
  await requireSession();
  const parsed = id.safeParse(batchId);
  if (!parsed.success || !(await deleteRevolutImport(parsed.data))) return failure("Cet import n'existe plus");
  revalidatePath("/finances", "layout");
  return { ok: true };
}
