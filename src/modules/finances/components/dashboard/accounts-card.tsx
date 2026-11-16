import { formatCents } from "@/shared/lib/money";
import type { Dashboard } from "../../domain/dashboard";
import { Card } from "./card";

export function AccountsCard({ dashboard }: { dashboard: Dashboard }) {
  const topLevel = dashboard.accounts.filter((account) => !account.parentId);
  const pocketsOf = (id: string) => dashboard.accounts.filter((account) => account.parentId === id);

  return (
    <Card title="Comptes" aside={<span className="font-medium text-foreground tabular-nums">{formatCents(dashboard.total.clearedCents)}</span>}>
      <ul className="space-y-3">
        {topLevel.map((account) => {
          const pockets = pocketsOf(account.id);
          return (
            <li key={account.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{account.name}</span>
                <span className={`font-semibold tabular-nums ${account.totalBalance.clearedCents < 0 ? "text-destructive" : ""}`}>
                  {formatCents(account.totalBalance.clearedCents)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>Début {formatCents(account.startCents + pockets.reduce((sum, pocket) => sum + pocket.startCents, 0))}</span>
                {account.totalBalance.projectedCents !== account.totalBalance.clearedCents ? (
                  <span>Prévu {formatCents(account.totalBalance.projectedCents)}</span>
                ) : null}
              </div>
              {pockets.length > 0 ? (
                <ul className="mt-2 space-y-1 border-l-2 pl-3">
                  <li className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disponible</span>
                    <span className="tabular-nums">{formatCents(account.balance.clearedCents)}</span>
                  </li>
                  {pockets.map((pocket) => (
                    <li key={pocket.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{pocket.name}</span>
                      <span className="tabular-nums">{formatCents(pocket.balance.clearedCents)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
