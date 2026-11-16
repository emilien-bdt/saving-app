"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { todayIso } from "@/shared/lib/today";
import { Button } from "@/shared/ui/button";
import { deleteInterestRate, saveInterestRate } from "../../actions/interest";
import type { AccountSettingsItem } from "../../view-models";
import { formatDateFr, formatRateBp } from "../format";

const inputClass =
  "h-10 rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive sm:text-sm";

/** Rates history of a savings account; a rate can be added or removed at any date, even in the past. */
export function InterestRatesEditor({ account }: { account: AccountSettingsItem }) {
  const [validFrom, setValidFrom] = useState(() => todayIso());
  const [rate, setRate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rates = [...account.interestRates].reverse();
  // Rendered only in the dialog (client side), so reading today's date here cannot break hydration.
  const today = todayIso();
  const currentId = rates.find((candidate) => candidate.validFromIso <= today)?.id;

  const add = () =>
    startTransition(async () => {
      const result = await saveInterestRate(account.id, { validFrom, rate });
      if (result.ok) {
        setRate("");
        setErrors({});
        setError(null);
      } else {
        setErrors(result.fieldErrors);
        setError(result.error);
      }
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteInterestRate(id);
      setError(result.ok ? null : result.error);
    });

  return (
    <fieldset className="grid gap-2 rounded-xl border p-3">
      <legend className="px-1 text-sm font-medium">Intérêts journaliers</legend>
      <p className="text-xs text-muted-foreground">
        Chaque jour : solde × taux annuel / 365, arrondi au centime, ajouté au solde. Un taux s’applique à partir de sa date
        jusqu’au suivant (0 % = arrêt) ; changer un taux passé recalcule tout.
      </p>

      {rates.length > 0 ? (
        <ul className="divide-y text-sm">
          {rates.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1">
              <span>
                À partir du {formatDateFr(item.validFromIso)}
                {item.id === currentId ? (
                  <span className="text-muted-foreground"> · en cours</span>
                ) : null}
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium tabular-nums">{formatRateBp(item.rateBp)}</span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Supprimer le taux du ${formatDateFr(item.validFromIso)}`} disabled={pending} onClick={() => remove(item.id)}>
                  <X aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun taux : pas d’intérêts.</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          À partir du
          <input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} aria-invalid={errors.validFrom ? true : undefined} className={inputClass} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Taux annuel (%)
          <input
            inputMode="decimal"
            placeholder="2,25"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            aria-invalid={errors.rate ? true : undefined}
            className={`${inputClass} w-24`}
          />
        </label>
        <Button type="button" variant="outline" disabled={pending || rate.trim() === ""} onClick={add}>
          Ajouter
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Même date qu’un taux existant : il est remplacé.</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
