"use client";

import { Circle, CircleCheckBig } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setTaskDone } from "../actions/tasks";

/** One tap to tick / untick a task (optimistic). */
export function TaskCheck({ id, done, title }: { id: string; done: boolean; title: string }) {
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
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
    >
      {optimisticDone ? (
        <CircleCheckBig className="size-6 text-positive" aria-hidden />
      ) : (
        <Circle className="size-6 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}
