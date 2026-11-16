import { formatCents } from "@/shared/lib/money";
import type { MonthSummary as Summary } from "../domain/transaction-list";
import { formatSignedCents } from "./format";

function Figure({ label, cleared, projected, tone }: { label: string; cleared: string; projected: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums sm:text-lg ${tone ?? ""}`}>{cleared}</p>
      {projected !== cleared ? <p className="text-xs text-muted-foreground tabular-nums">Prévu : {projected}</p> : null}
    </div>
  );
}

/** Apports / Dépenses / Tendance of the displayed transactions (pointé, and prévisionnel when different). */
export function MonthSummary({ summary }: { summary: Summary }) {
  const trendTone = summary.trend.clearedCents < 0 ? "text-destructive" : "text-emerald-600";
  return (
    <div className="grid grid-cols-3 gap-2">
      <Figure
        label="Apports"
        cleared={formatCents(summary.income.clearedCents)}
        projected={formatCents(summary.income.projectedCents)}
      />
      <Figure
        label="Dépenses"
        cleared={formatCents(summary.expense.clearedCents)}
        projected={formatCents(summary.expense.projectedCents)}
      />
      <Figure
        label="Tendance"
        cleared={formatSignedCents(summary.trend.clearedCents)}
        projected={formatSignedCents(summary.trend.projectedCents)}
        tone={trendTone}
      />
    </div>
  );
}
