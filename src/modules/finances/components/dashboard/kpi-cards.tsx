import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCents } from "@/shared/lib/money";
import type { Dashboard } from "../../domain/dashboard";
import { formatSignedCents, monthName } from "../format";

type Kpi = { label: string; cents: number; projectedCents: number; deltaCents: number; signed?: boolean; hint: string };

function KpiCard({ label, cents, projectedCents, deltaCents, signed, hint }: Kpi) {
  const tone = signed ? (cents < 0 ? "text-destructive" : "text-positive") : "";
  const DeltaIcon = deltaCents >= 0 ? TrendingUp : TrendingDown;
  return (
    <div className="min-w-0 rounded-2xl bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold sm:text-2xl tabular-nums ${tone}`}>{signed ? formatSignedCents(cents) : formatCents(cents)}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {deltaCents !== 0 ? (
          <span className={`inline-flex items-center gap-1 ${deltaCents >= 0 ? "text-positive" : "text-destructive"}`}>
            <DeltaIcon className="size-3.5" aria-hidden />
            {formatSignedCents(deltaCents)} {hint}
          </span>
        ) : null}
        {projectedCents !== cents ? (
          <span className="tabular-nums">Prévu : {signed ? formatSignedCents(projectedCents) : formatCents(projectedCents)}</span>
        ) : null}
      </div>
    </div>
  );
}

export function KpiCards({ dashboard }: { dashboard: Dashboard }) {
  const previous = `vs ${monthName(dashboard.month.month === 1 ? 12 : dashboard.month.month - 1)}`;
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicateurs du mois">
      <KpiCard
        label="Total"
        cents={dashboard.total.clearedCents}
        projectedCents={dashboard.total.projectedCents}
        deltaCents={dashboard.total.clearedCents - dashboard.previous.totalCents}
        hint={previous}
      />
      <KpiCard
        label="Épargne"
        cents={dashboard.savings.clearedCents}
        projectedCents={dashboard.savings.projectedCents}
        deltaCents={dashboard.savings.clearedCents - dashboard.previous.savingsCents}
        hint={previous}
      />
      <KpiCard
        label="Pockets"
        cents={dashboard.pockets.clearedCents}
        projectedCents={dashboard.pockets.projectedCents}
        deltaCents={dashboard.pockets.clearedCents - dashboard.previous.pocketsCents}
        hint={previous}
      />
      <KpiCard
        label="Tendance (apports − dépenses)"
        cents={dashboard.trend.clearedCents}
        projectedCents={dashboard.trend.projectedCents}
        deltaCents={dashboard.trend.projectedCents - dashboard.previous.trendCents}
        signed
        hint={previous}
      />
    </section>
  );
}
