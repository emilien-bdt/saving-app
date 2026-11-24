import type { ReactNode } from "react";
import { formatCents } from "@/shared/lib/money";
import { todayIso } from "@/shared/lib/today";
import { ios } from "@/shared/ui/ios";
import { getDashboard } from "../data/dashboard";
import { parseMonthParam } from "../domain/month-param";
import { formatSignedCents } from "./format";

/** Home widget (half width): total, the month's trend and expenses (same figures as Piloter). */
export async function FinancesHomeWidget(): Promise<ReactNode> {
  const month = parseMonthParam(undefined, todayIso());
  const { dashboard } = await getDashboard(month);
  const { total, trend, expense } = dashboard;
  const spent = expense.clearedCents;
  const planned = Math.max(expense.projectedCents, spent);
  const percent = planned === 0 ? 0 : Math.round((spent / planned) * 100);

  return (
    <div className="flex flex-1 flex-col">
      <p className={ios.hint}>Total</p>
      <p className="truncate text-2xl font-bold tracking-tight tabular-nums">{formatCents(total.clearedCents)}</p>
      <p className={`truncate text-[13px] font-semibold tabular-nums ${trend.clearedCents < 0 ? "text-destructive" : "text-positive"}`}>
        {formatSignedCents(trend.clearedCents)} ce mois
      </p>
      <div className="mt-auto pt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-app-finances" style={{ width: `${percent}%` }} />
        </div>
        <p className={`${ios.hint} mt-1.5 truncate tabular-nums`}>
          {planned > spent ? `${formatCents(spent)} dépensés / ${formatCents(planned)}` : `${formatCents(spent)} dépensés`}
        </p>
      </div>
    </div>
  );
}
