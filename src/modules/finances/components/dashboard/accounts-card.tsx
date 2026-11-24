import { formatCents } from "@/shared/lib/money";
import { ACCOUNT_GROUP_LABELS } from "../../domain/accounts";
import type { AccountGroupLine, AccountLine, Dashboard } from "../../domain/dashboard";
import type { Balance } from "../../domain/balances";
import { formatSignedCents } from "../format";
import { Card } from "./card";

function Evolution({ startCents, balance }: { startCents: number; balance: Balance }) {
  const delta = balance.clearedCents - startCents;
  return (
    <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
      <span>
        Début {formatCents(startCents)}
        {delta !== 0 ? <span className={delta > 0 ? "text-positive" : "text-destructive"}> ({formatSignedCents(delta)})</span> : null}
      </span>
      {balance.projectedCents !== balance.clearedCents ? <span>Prévu {formatCents(balance.projectedCents)}</span> : null}
    </div>
  );
}

function AccountRow({ account, showParent }: { account: AccountLine; showParent: boolean }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>
          {account.name}
          {showParent && account.parentName ? <span className="text-muted-foreground"> · {account.parentName}</span> : null}
        </span>
        <span className={`tabular-nums ${account.balance.clearedCents < 0 ? "text-destructive" : ""}`}>
          {formatCents(account.balance.clearedCents)}
        </span>
      </div>
      {account.balance.projectedCents !== account.balance.clearedCents ? (
        <div className="text-right text-xs text-muted-foreground tabular-nums">Prévu {formatCents(account.balance.projectedCents)}</div>
      ) : null}
    </li>
  );
}

function GroupBlock({ line }: { line: AccountGroupLine }) {
  const parents = new Set(line.accounts.map((account) => account.parentId));
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{ACCOUNT_GROUP_LABELS[line.group]}</h3>
        <span className={`font-semibold tabular-nums ${line.balance.clearedCents < 0 ? "text-destructive" : ""}`}>
          {formatCents(line.balance.clearedCents)}
        </span>
      </div>
      <Evolution startCents={line.startCents} balance={line.balance} />
      {line.accounts.length > 1 || line.group === "POCKETS" ? (
        <ul className="space-y-1 border-l-2 pl-3">
          {line.accounts.map((account) => (
            <AccountRow key={account.id} account={account} showParent={parents.size > 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Courant / Épargne / Pockets, each with its own total (pockets are not added to their account). */
export function AccountsCard({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Card title="Comptes" aside={<span className="font-medium text-foreground tabular-nums">{formatCents(dashboard.total.clearedCents)}</span>}>
      <ul className="space-y-4">
        {dashboard.groups.map((line) => (
          <GroupBlock key={line.group} line={line} />
        ))}
      </ul>
    </Card>
  );
}
