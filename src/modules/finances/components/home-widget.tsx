import type { ReactNode } from "react";
import { formatCents } from "@/shared/lib/money";
import { todayIso } from "@/shared/lib/today";
import { getDashboard } from "../data/dashboard";
import { parseMonthParam } from "../domain/month-param";
import { formatSignedCents, monthName } from "./format";

function Figure({ label, value, tone = "", hint }: { label: string; value: string; tone?: string; hint: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-lg font-semibold tabular-nums sm:text-xl ${tone}`}>{value}</p>
      {hint ? <p className="truncate text-xs text-muted-foreground tabular-nums">{hint}</p> : null}
    </div>
  );
}

/** Home widget: total, the month's trend and expenses (current month, same figures as Piloter). */
export async function FinancesHomeWidget(): Promise<ReactNode> {
  const month = parseMonthParam(undefined, todayIso());
  const { dashboard } = await getDashboard(month);
  const { total, trend, expense } = dashboard;
  const planned = (projected: number, current: number, format: (cents: number) => string) =>
    projected !== current ? `Prévu : ${format(projected)}` : null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {monthName(month.month).replace(/^./, (letter) => letter.toUpperCase())} {month.year}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Figure label="Total" value={formatCents(total.clearedCents)} hint={planned(total.projectedCents, total.clearedCents, formatCents)} />
        <Figure
          label="Tendance"
          value={formatSignedCents(trend.clearedCents)}
          tone={trend.clearedCents < 0 ? "text-destructive" : "text-emerald-600"}
          hint={planned(trend.projectedCents, trend.clearedCents, formatSignedCents)}
        />
        <Figure
          label="Dépenses du mois"
          value={formatCents(expense.clearedCents)}
          hint={planned(expense.projectedCents, expense.clearedCents, formatCents)}
        />
      </div>
    </div>
  );
}
