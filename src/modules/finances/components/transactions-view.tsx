"use client";

import { useMemo, useState } from "react";
import type { TransactionView } from "../domain/list-filters";
import { groupByDay, groupByLabel } from "../domain/transaction-list";
import type { TransactionFormOptions, TransactionItem } from "../view-models";
import { CategoryIcon } from "./category-icon";
import { formatDayHeading, formatSignedCents, formatTransactionAmount } from "./format";
import { TransactionEditor } from "./transaction-editor";
import { TransactionRow } from "./transaction-row";

type Props = {
  transactions: TransactionItem[];
  view: TransactionView;
  options: TransactionFormOptions;
  /** Date proposed for a new entry (today, or the 1st of the displayed month). */
  defaultDate: string;
};

type EditorState = { key: number; transaction: TransactionItem | null };

export function TransactionsView({ transactions, view, options, defaultDate }: Props) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const open = (transaction: TransactionItem | null) =>
    setEditor((previous) => ({ key: (previous?.key ?? 0) + 1, transaction }));

  const accounts = useMemo(() => new Map(options.accounts.map((account) => [account.id, account])), [options.accounts]);
  const categories = useMemo(
    () => new Map(options.categories.map((category) => [category.id, category])),
    [options.categories],
  );

  const row = (transaction: TransactionItem) => (
    <TransactionRow
      key={transaction.id}
      transaction={transaction}
      account={accounts.get(transaction.accountId)}
      toAccount={transaction.toAccountId ? accounts.get(transaction.toAccountId) : undefined}
      category={transaction.categoryId ? categories.get(transaction.categoryId) : undefined}
      showAccount={transaction.accountId !== options.defaultAccountId}
      onOpen={() => open(transaction)}
    />
  );

  return (
    <>
      {transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <p>Aucune transaction.</p>
          <button type="button" onClick={() => open(null)} className="mt-2 text-sm font-medium text-primary">
            Ajouter une transaction
          </button>
        </div>
      ) : view === "detailed" ? (
        <div className="space-y-5">
          {groupByDay(transactions).map((group) => (
            <section key={group.key} aria-label={group.dateIso ? formatDayHeading(group.dateIso) : "Plusieurs jours"}>
              <h3 className="flex items-baseline justify-between border-b pb-1 text-sm font-medium text-muted-foreground">
                <span>{group.dateIso ? formatDayHeading(group.dateIso) : "Plusieurs jours dans le mois"}</span>
                <span className="tabular-nums">{group.netCents !== 0 ? formatSignedCents(group.netCents) : null}</span>
              </h3>
              <ul>{group.items.map(row)}</ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {groupByLabel(transactions).map((group) => {
            const category = group.categoryId ? categories.get(group.categoryId) : undefined;
            return (
              <li key={group.key}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-muted">
                    <span
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: category?.color ?? "#64748b" }}
                    >
                      <CategoryIcon icon={category?.icon ?? null} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {group.label}
                        {group.items.length > 1 ? <span className="text-muted-foreground"> ×{group.items.length}</span> : null}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {category?.name ?? (group.type === "TRANSFER" ? "Virement" : "")}
                        {group.plannedCount > 0 ? ` · ${group.plannedCount} prévue(s)` : ""}
                      </span>
                    </span>
                    <span className={`shrink-0 font-medium tabular-nums ${group.type === "INCOME" ? "text-emerald-600" : ""}`}>
                      {formatTransactionAmount(group.totalCents, group.type)}
                    </span>
                  </summary>
                  <ul className="border-t bg-muted/30 px-1">{group.items.map(row)}</ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}


      {editor ? (
        <TransactionEditor
          key={editor.key}
          transaction={editor.transaction}
          options={options}
          defaultDate={defaultDate}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </>
  );
}
