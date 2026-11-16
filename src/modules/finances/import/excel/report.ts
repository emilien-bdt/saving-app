import { formatCents } from "@/shared/lib/money";
import type { YearMonth } from "../../domain/period";
import { IMPORT_ACCOUNTS } from "./mapping";
import type { CheckResult } from "./reconcile";
import type { ImportPlan } from "./types";

const monthLabel = ({ year, month }: YearMonth) => `${String(month).padStart(2, "0")}/${year}`;
const signed = (cents: number) => `${cents > 0 ? "+" : ""}${formatCents(cents)}`;

/** Plain-text report printed by `npm run import:excel`. */
export function formatImportReport(plan: ImportPlan, checks: readonly CheckResult[]): string {
  const first = plan.months[0];
  const last = plan.months.at(-1);
  const planned = plan.transactions.filter((transaction) => transaction.status === "PLANNED").length;
  const unknownDay = plan.transactions.filter((transaction) => transaction.dayUnknown).length;
  const lines: string[] = [];

  lines.push(
    `Import Excel — ${plan.months.length} mois (${first ? monthLabel(first.yearMonth) : "?"} → ${last ? monthLabel(last.yearMonth) : "?"})`,
    `${plan.transactions.length} transactions, dont ${planned} prévues et ${unknownDay} sans jour (datées fin de mois)`,
    "",
    "Comptes :",
  );
  for (const key of plan.accounts) {
    const account = IMPORT_ACCOUNTS[key];
    const flags = [account.parentKey ? `pocket de ${IMPORT_ACCOUNTS[account.parentKey].name}` : null, account.closed ? "archivé" : null]
      .filter(Boolean)
      .join(", ");
    lines.push(`  • ${account.name} — solde initial ${formatCents(plan.initialBalances[key])}${flags ? ` (${flags})` : ""}`);
  }

  const mismatches = checks.filter((check) => check.diffCents !== 0);
  lines.push("", `Contrôle des soldes « Actuel » : ${checks.length - mismatches.length}/${checks.length} identiques à l'Excel`);
  for (const check of mismatches) {
    const names = check.accounts.map((key) => IMPORT_ACCOUNTS[key].name).join(" + ");
    lines.push(
      `  ✗ ${monthLabel(check.yearMonth)} ${check.cell} ${names} : Excel ${formatCents(check.excelCents)}, recalculé ${formatCents(check.computedCents)} (écart ${signed(check.diffCents)})`,
    );
  }

  if (plan.warnings.length > 0) {
    lines.push("", `Avertissements (${plan.warnings.length}) :`, ...plan.warnings.map((warning) => `  - ${warning}`));
  }
  return lines.join("\n").replace(/[  ]/g, " ");
}
