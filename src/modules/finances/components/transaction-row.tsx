"use client";

import { ArrowLeftRight, Percent, PiggyBank } from "lucide-react";
import type { AccountOption, CategoryOption, TransactionItem } from "../view-models";
import { CategoryIcon } from "./category-icon";
import { formatTransactionAmount } from "./format";
import { StatusToggle } from "./status-toggle";

type Props = {
  transaction: TransactionItem;
  account: AccountOption | undefined;
  toAccount: AccountOption | undefined;
  category: CategoryOption | undefined;
  /** Account shown only when it is not the default one (or for transfers). */
  showAccount: boolean;
  onOpen: () => void;
};

export function TransactionRow(props: Props) {
  if (props.transaction.computed) return <ComputedRow transaction={props.transaction} account={props.account} />;
  return <StoredRow {...props} />;
}

/** Daily interest computed by the app: read-only (rates are set in Paramètres › Comptes). */
function ComputedRow({ transaction, account }: Pick<Props, "transaction" | "account">) {
  const planned = transaction.status === "PLANNED";
  return (
    <li className="flex items-center gap-1">
      <span className="inline-flex size-9 shrink-0 items-center justify-center text-muted-foreground" title="Calculé automatiquement">
        <Percent className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-positive text-card">
          <PiggyBank className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{transaction.label}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {[planned ? "à venir d'ici la fin du mois" : "calculés chaque jour", account?.displayName].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className={`shrink-0 font-medium text-positive tabular-nums ${planned ? "opacity-60" : ""}`}>
          {formatTransactionAmount(transaction.amountCents, transaction.type)}
        </span>
      </div>
    </li>
  );
}

function StoredRow({ transaction, account, toAccount, category, showAccount, onOpen }: Props) {
  const isTransfer = transaction.type === "TRANSFER";
  const details = [
    transaction.note,
    isTransfer ? null : showAccount ? account?.displayName : null,
    transaction.status === "PLANNED" ? "prévue" : null,
  ].filter(Boolean);
  const fallback = isTransfer
    ? transaction.label.includes("→")
      ? "Virement interne"
      : `${account?.displayName ?? "?"} → ${toAccount?.displayName ?? "?"}`
    : (category?.name ?? "");

  return (
    <li className="flex items-center gap-1">
      <StatusToggle id={transaction.id} status={transaction.status} />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-4 text-left active:opacity-60"
      >
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: isTransfer ? "#64748b" : (category?.color ?? "#64748b") }}
        >
          {isTransfer ? <ArrowLeftRight className="size-4" aria-hidden /> : <CategoryIcon icon={category?.icon ?? null} className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{transaction.label}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {details.length > 0 ? details.join(" · ") : fallback}
          </span>
        </span>
        <span
          className={`shrink-0 font-medium tabular-nums ${transaction.type === "INCOME" ? "text-positive" : ""} ${transaction.status === "PLANNED" ? "opacity-60" : ""}`}
        >
          {formatTransactionAmount(transaction.amountCents, transaction.type)}
        </span>
      </button>
    </li>
  );
}
