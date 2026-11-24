import Link from "next/link";
import { formatCents } from "@/shared/lib/money";
import type { Dashboard } from "../../domain/dashboard";
import { CategoryIcon } from "../category-icon";
import { formatSignedCents } from "../format";

const percent = (value: number) => `${Math.round(value * 100)} %`;

/** Where the money goes: one bar per top-level category (planned part lighter), compared with the 6-month average. */
export function ExpensesCard({ dashboard, monthParam }: { dashboard: Dashboard; monthParam: string }) {
  const max = Math.max(...dashboard.expenses.map((line) => line.projectedCents), 1);
  const delta = dashboard.expense.projectedCents - dashboard.previous.expenseCents;

  return (
    <section className="rounded-xl border bg-card p-4 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Où part l&apos;argent</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{formatCents(dashboard.expense.projectedCents)}</span> dépensés
          {dashboard.previous.expenseCents > 0 ? (
            <span className={delta > 0 ? "text-destructive" : "text-positive"}> · {formatSignedCents(delta)} vs mois dernier</span>
          ) : null}
        </p>
      </div>

      {dashboard.expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune dépense ce mois-ci.</p>
      ) : (
        <ul className="space-y-4">
          {dashboard.expenses.map((line) => {
            const vsAverage = line.averageCents ? (line.projectedCents - line.averageCents) / line.averageCents : null;
            return (
              <li key={line.id}>
                <Link href={`/finances/transactions?mois=${monthParam}&categorie=${line.id}`} className="block rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: line.color }}
                    >
                      <CategoryIcon icon={line.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{line.name}</span>
                    <span className="text-xs text-muted-foreground">{percent(line.share)}</span>
                    <span className="w-24 text-right font-medium tabular-nums">{formatCents(line.projectedCents)}</span>
                  </div>
                  <div className="mt-1.5 ml-9 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full" style={{ width: `${(line.projectedCents / max) * 100}%` }}>
                      <div className="h-full" style={{ backgroundColor: line.color, flexGrow: line.clearedCents }} />
                      <div className="h-full opacity-40" style={{ backgroundColor: line.color, flexGrow: line.projectedCents - line.clearedCents }} />
                    </div>
                  </div>
                  <div className="mt-1 ml-9 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {line.children.length > 0
                      ? line.children.map((child) => (
                          <span key={child.id}>
                            {child.name.split(",")[0]} {formatCents(child.cents)}
                          </span>
                        ))
                      : line.topLabels.map((label) => (
                          <span key={label.label}>
                            {label.label}
                            {label.count > 1 ? ` ×${label.count}` : ""} {formatCents(label.cents)}
                          </span>
                        ))}
                    {vsAverage !== null && Math.abs(vsAverage) >= 0.1 ? (
                      <span className={vsAverage > 0 ? "text-destructive" : "text-positive"}>
                        {vsAverage > 0 ? "+" : "−"}
                        {percent(Math.abs(vsAverage))} vs moyenne
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
