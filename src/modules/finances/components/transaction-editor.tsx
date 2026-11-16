"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { addDaysIso, todayIso } from "@/shared/lib/today";
import { Button } from "@/shared/ui/button";
import { deleteTransaction, saveTransaction } from "../actions/transactions";
import { matchSuggestions } from "../domain/suggestions";
import {
  applySuggestion,
  changeDate,
  changeType,
  emptyFormValues,
  formValuesFromTransaction,
  formValuesToInput,
  type TransactionFormValues,
  valuesForNextEntry,
} from "../domain/transaction-form";
import type { TransactionType } from "../domain/types";
import type { TransactionFormOptions, TransactionItem } from "../view-models";
import { CategoryIcon } from "./category-icon";

const TYPES: { type: TransactionType; label: string }[] = [
  { type: "EXPENSE", label: "Dépense" },
  { type: "INCOME", label: "Revenu" },
  { type: "TRANSFER", label: "Virement" },
];

const inputClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

type Props = {
  /** null = new transaction. */
  transaction: TransactionItem | null;
  options: TransactionFormOptions;
  defaultDate: string;
  onClose: () => void;
};

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function TransactionEditor({ transaction, options, defaultDate, onClose }: Props) {
  const isNew = transaction === null;
  const [values, setValues] = useState<TransactionFormValues>(() =>
    transaction
      ? formValuesFromTransaction(transaction)
      : emptyFormValues({ date: defaultDate, accountId: options.defaultAccountId ?? "" }),
  );
  const [categoryChosen, setCategoryChosen] = useState(!isNew);
  const [labelFocused, setLabelFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const today = todayIso();
  const keptIds = new Set([transaction?.accountId, transaction?.toAccountId, transaction?.categoryId]);
  const kindOf = (id: string) => options.categories.find((category) => category.id === id)?.kind;

  const accounts = options.accounts.filter((account) => !account.archived || keptIds.has(account.id));
  const categoryChips = useMemo(
    () =>
      options.categories
        .filter(
          (category) =>
            category.kind === values.type &&
            !category.hasChildren &&
            (!category.archived || category.id === values.categoryId),
        )
        .sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name, "fr")),
    [options.categories, values.type, values.categoryId],
  );
  const suggestions = labelFocused ? matchSuggestions(options.suggestions, values.label) : [];

  const set = (changes: Partial<TransactionFormValues>) => setValues((current) => ({ ...current, ...changes }));

  const submit = (mode: "close" | "continue") =>
    startTransition(async () => {
      const result = await saveTransaction(transaction?.id ?? null, formValuesToInput(values));
      if (!result.ok) {
        setErrors(result.fieldErrors);
        setFormError(result.error);
        return;
      }
      if (mode === "close") {
        onClose();
        return;
      }
      setValues(valuesForNextEntry(values));
      setCategoryChosen(false);
      setErrors({});
      setFormError(null);
      setSavedCount((count) => count + 1);
      amountRef.current?.focus();
    });

  const remove = () =>
    startTransition(async () => {
      if (!transaction) return;
      const result = await deleteTransaction(transaction.id);
      if (result.ok) onClose();
      else setFormError(result.error);
    });

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          initialFocus={amountRef}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {isNew ? "Nouvelle transaction" : "Modifier la transaction"}
            </Dialog.Title>
            <Dialog.Close className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted" aria-label="Fermer">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit("close");
            }}
          >
            <div className="grid grid-cols-3 rounded-lg border p-0.5" role="group" aria-label="Type">
              {TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={values.type === type}
                  onClick={() => setValues((current) => changeType(current, type, kindOf))}
                  className="rounded-md py-1.5 text-sm aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="amount" className="sr-only">
                Montant
              </label>
              <div className="flex items-baseline gap-2">
                <input
                  ref={amountRef}
                  id="amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={values.amount}
                  onChange={(event) => set({ amount: event.target.value })}
                  aria-invalid={errors.amount ? true : undefined}
                  className="w-full border-b bg-transparent py-1 text-4xl font-semibold tabular-nums outline-none aria-invalid:border-destructive"
                />
                <span className="text-2xl text-muted-foreground">€</span>
              </div>
              <FieldError message={errors.amount} />
            </div>

            <div className="relative">
              <label htmlFor="label" className="mb-1 block text-sm font-medium">
                {values.type === "INCOME" ? "Source" : values.type === "TRANSFER" ? "Libellé" : "Commerçant / libellé"}
              </label>
              <input
                id="label"
                autoComplete="off"
                value={values.label}
                onChange={(event) => set({ label: event.target.value })}
                onFocus={() => setLabelFocused(true)}
                onBlur={() => setTimeout(() => setLabelFocused(false), 150)}
                aria-invalid={errors.label ? true : undefined}
                className={inputClass}
              />
              {suggestions.length > 0 ? (
                <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.labelKey}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setValues((current) => applySuggestion(current, suggestion, categoryChosen));
                          setLabelFocused(false);
                        }}
                        className="flex w-full justify-between px-3 py-2 text-left hover:bg-muted"
                      >
                        <span>{suggestion.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {options.categories.find((category) => category.id === suggestion.categoryId)?.name ?? ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <FieldError message={errors.label} />
            </div>

            {values.type === "TRANSFER" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-medium">
                  De
                  <select
                    value={values.accountId}
                    onChange={(event) => set({ accountId: event.target.value })}
                    className={inputClass}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.accountId} />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Vers
                  <select
                    value={values.toAccountId ?? ""}
                    onChange={(event) => set({ toAccountId: event.target.value || null })}
                    aria-invalid={errors.toAccountId ? true : undefined}
                    className={inputClass}
                  >
                    <option value="">Choisir…</option>
                    {accounts
                      .filter((account) => account.id !== values.accountId)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.displayName}
                        </option>
                      ))}
                  </select>
                  <FieldError message={errors.toAccountId} />
                </label>
              </div>
            ) : (
              <fieldset>
                <legend className="mb-1 text-sm font-medium">Catégorie</legend>
                <div className="flex flex-wrap gap-2">
                  {categoryChips.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={values.categoryId === category.id}
                      onClick={() => {
                        set({ categoryId: category.id });
                        setCategoryChosen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm aria-pressed:border-transparent aria-pressed:text-white"
                      style={values.categoryId === category.id ? { backgroundColor: category.color } : undefined}
                    >
                      <CategoryIcon icon={category.icon} className="size-4" />
                      {category.name}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.categoryId} />
              </fieldset>
            )}

            <div className="grid gap-1">
              <span className="text-sm font-medium">Date</span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "Aujourd'hui", date: today },
                  { label: "Hier", date: addDaysIso(today, -1) },
                ].map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    aria-pressed={values.date === shortcut.date && !values.dayUnknown}
                    onClick={() => setValues((current) => changeDate({ ...current, dayUnknown: false }, shortcut.date))}
                    className="rounded-full border px-3 py-1.5 text-sm aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {shortcut.label}
                  </button>
                ))}
                <input
                  type="date"
                  aria-label="Date"
                  value={values.date}
                  onChange={(event) => event.target.value && setValues((current) => changeDate(current, event.target.value))}
                  aria-invalid={errors.date ? true : undefined}
                  className="h-9 rounded-lg border bg-background px-2 text-base sm:text-sm"
                />
              </div>
              {values.dayUnknown ? (
                <p className="text-sm text-muted-foreground">Plusieurs jours dans le mois (import Excel).</p>
              ) : null}
              <FieldError message={errors.date} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {values.type === "TRANSFER" ? null : (
                <label className="grid gap-1 text-sm font-medium">
                  Compte
                  <select
                    value={values.accountId}
                    onChange={(event) => set({ accountId: event.target.value })}
                    aria-invalid={errors.accountId ? true : undefined}
                    className={inputClass}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.accountId} />
                </label>
              )}
              <div className="grid gap-1 text-sm font-medium">
                Statut
                <button
                  type="button"
                  aria-pressed={values.status === "CLEARED"}
                  onClick={() => set({ status: values.status === "CLEARED" ? "PLANNED" : "CLEARED" })}
                  className="h-11 rounded-lg border text-base font-normal aria-pressed:border-emerald-600 aria-pressed:text-emerald-700"
                >
                  {values.status === "CLEARED" ? "✓ Pointée" : "Prévue"}
                </button>
              </div>
            </div>

            <details open={values.note !== ""}>
              <summary className="cursor-pointer text-sm text-muted-foreground">Note (facultatif)</summary>
              <textarea
                value={values.note}
                onChange={(event) => set({ note: event.target.value })}
                rows={2}
                aria-label="Note"
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-base"
              />
              <FieldError message={errors.note} />
            </details>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : savedCount > 0 ? (
              <p role="status" className="text-sm text-emerald-700">
                {savedCount} transaction{savedCount > 1 ? "s" : ""} ajoutée{savedCount > 1 ? "s" : ""} ✓
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isNew ? (
                <Button type="button" variant="outline" size="lg" disabled={pending} onClick={() => submit("continue")}>
                  Ajouter et continuer
                </Button>
              ) : confirmDelete ? (
                <span className="mr-auto flex items-center gap-2 text-sm">
                  Supprimer ?
                  <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={remove}>
                    Oui, supprimer
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    Non
                  </Button>
                </span>
              ) : (
                <Button type="button" variant="ghost" size="lg" className="mr-auto text-destructive" onClick={() => setConfirmDelete(true)}>
                  Supprimer
                </Button>
              )}
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Enregistrement…" : isNew ? "Ajouter" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
