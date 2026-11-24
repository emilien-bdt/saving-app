import Link from "next/link";
import { formatCents } from "@/shared/lib/money";
import type { Dashboard } from "../../domain/dashboard";
import { formatDayHeading, formatSignedCents, formatTransactionAmount } from "../format";
import { Card } from "./card";

export function IncomesCard({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Card title="Apports" aside={<span className="font-medium text-positive tabular-nums">{formatCents(dashboard.income.projectedCents)}</span>}>
      {dashboard.incomes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun apport ce mois-ci.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {dashboard.incomes.map((income) => (
            <li key={income.label} className="flex justify-between gap-2">
              <span className="truncate">
                {income.label}
                {income.count > 1 ? <span className="text-muted-foreground"> ×{income.count}</span> : null}
              </span>
              <span className="tabular-nums">{formatCents(income.cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TransfersCard({ dashboard, accountNames }: { dashboard: Dashboard; accountNames: Record<string, string> }) {
  if (dashboard.transfers.length === 0) return null;
  return (
    <Card title="Virements internes">
      <ul className="space-y-1 text-sm">
        {dashboard.transfers.map((transfer) => (
          <li key={`${transfer.fromId}>${transfer.toId}`} className="flex justify-between gap-2">
            <span className="truncate">
              {accountNames[transfer.fromId] ?? "?"} → {accountNames[transfer.toId] ?? "?"}
            </span>
            <span className="tabular-nums">{formatCents(transfer.cents)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PlannedCard({ dashboard, monthParam }: { dashboard: Dashboard; monthParam: string }) {
  if (dashboard.planned.count === 0) return null;
  return (
    <Card
      title="À pointer"
      aside={
        <Link href={`/finances/transactions?mois=${monthParam}&statut=prevue`} className="text-primary">
          {dashboard.planned.count} opération{dashboard.planned.count > 1 ? "s" : ""}
        </Link>
      }
    >
      <ul className="space-y-1 text-sm">
        {dashboard.planned.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="truncate">
              {item.label} <span className="text-muted-foreground">· {formatDayHeading(item.dateIso)}</span>
            </span>
            <span className="tabular-nums">{formatTransactionAmount(item.amountCents, item.type)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Impact sur le solde : {formatSignedCents(dashboard.planned.cents)}</p>
    </Card>
  );
}

export function TopMerchantsCard({ dashboard }: { dashboard: Dashboard }) {
  if (dashboard.topMerchants.length === 0) return null;
  return (
    <Card title="Plus gros postes">
      <ol className="space-y-1 text-sm">
        {dashboard.topMerchants.map((merchant, index) => (
          <li key={merchant.label} className="flex justify-between gap-2">
            <span className="truncate">
              <span className="text-muted-foreground">{index + 1}.</span> {merchant.label}
              {merchant.count > 1 ? <span className="text-muted-foreground"> ×{merchant.count}</span> : null}
            </span>
            <span className="tabular-nums">{formatCents(merchant.cents)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
