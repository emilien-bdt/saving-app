"use client";

import { CircleCheck, CircleDashed } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setTransactionStatus } from "../actions/transactions";
import type { TransactionStatus } from "../domain/types";

/** One tap to clear / un-clear a transaction (optimistic). */
export function StatusToggle({ id, status }: { id: string; status: TransactionStatus }) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [, startTransition] = useTransition();
  const cleared = optimisticStatus === "CLEARED";

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const next: TransactionStatus = cleared ? "PLANNED" : "CLEARED";
          setOptimisticStatus(next);
          await setTransactionStatus(id, next);
        })
      }
      aria-pressed={cleared}
      aria-label={cleared ? "Pointée — marquer comme prévue" : "Prévue — marquer comme pointée"}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
    >
      {cleared ? (
        <CircleCheck className="size-6 text-positive" aria-hidden />
      ) : (
        <CircleDashed className="size-6 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}
