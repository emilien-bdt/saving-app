"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { ios } from "@/shared/ui/ios";
import { undoBankImport } from "../../actions/bank-import";
import type { BankImportBatch } from "../../data/bank-import";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

/** Last bank statement imports; undoing one deletes the operations it created (recognised entries stay pointed). */
export function ImportHistory({ imports }: { imports: BankImportBatch[] }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (imports.length === 0) return null;

  const undo = (id: string) =>
    startTransition(async () => {
      const result = await undoBankImport(id);
      setError(result.ok ? null : result.error);
      setConfirming(null);
    });

  return (
    <section>
      <h3 className={ios.sectionLabel}>Derniers imports</h3>
      <ul className={ios.group}>
        {imports.map((batch) => (
          <li key={batch.id} className={ios.row}>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{batch.fileName}</span>
              <span className={ios.hint}>
                {dateTime.format(new Date(batch.importedAtIso))} · {batch.remaining} opération{batch.remaining > 1 ? "s" : ""} ajoutée
                {batch.remaining > 1 ? "s" : ""}
              </span>
            </span>
            {confirming === batch.id ? (
              <span className="flex shrink-0 gap-1">
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(null)}>
                  Non
                </Button>
                <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => undo(batch.id)}>
                  Supprimer
                </Button>
              </span>
            ) : (
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(batch.id)}>
                Annuler
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className={`${ios.hint} px-4 pt-1.5`}>
        Annuler un import supprime les opérations qu&apos;il a ajoutées ; les saisies reconnues restent pointées.
      </p>
      {error ? (
        <p role="alert" className={`${ios.alertError} mt-2`}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
