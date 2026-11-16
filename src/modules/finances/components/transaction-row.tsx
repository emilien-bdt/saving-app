"use client";

import { ArrowLeftRight } from "lucide-react";
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

export function TransactionRow({ transaction, account, toAccount, category, showAccount, onOpen }: Props) {
  const isTransfer = transaction.type === "TRANSFER";
  const details = [
    transaction.note,
    isTransfer ? `${account?.displayName ?? "?"} → ${toAccount?.displayName ?? "?"}` : showAccount ? account?.displayName : null,
    transaction.status === "PLANNED" ? "prévue" : null,
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-1">
      <StatusToggle id={transaction.id} status={transaction.status} />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-2 text-left hover:bg-muted"
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
            {details.length > 0 ? details.join(" · ") : (category?.name ?? "")}
          </span>
        </span>
        <span
          className={`shrink-0 font-medium tabular-nums ${transaction.type === "INCOME" ? "text-emerald-600" : ""} ${transaction.status === "PLANNED" ? "opacity-60" : ""}`}
        >
          {formatTransactionAmount(transaction.amountCents, transaction.type)}
        </span>
      </button>
    </li>
  );
}
