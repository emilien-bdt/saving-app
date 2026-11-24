"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setTaskDone } from "../actions/tasks";

/** One tap to tick / untick a task (optimistic), iOS Reminders-like circle. */
export function TaskCheck({ id, done, title, late = false }: { id: string; done: boolean; title: string; late?: boolean }) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimisticDone}
      aria-label={optimisticDone ? `« ${title} » : marquer à faire` : `« ${title} » : marquer comme faite`}
      onClick={() =>
        startTransition(async () => {
          setOptimisticDone(!optimisticDone);
          await setTaskDone(id, !optimisticDone);
        })
      }
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full active:scale-90 transition-transform"
    >
      {optimisticDone ? (
        <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" strokeWidth={3.2} aria-hidden />
        </span>
      ) : (
        <span className={`size-[22px] rounded-full border-2 ${late ? "border-destructive" : "border-muted-foreground/60"}`} aria-hidden />
      )}
    </button>
  );
}
