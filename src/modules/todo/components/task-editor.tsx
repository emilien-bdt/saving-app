"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Flag, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { addDaysIso, todayIso } from "@/shared/lib/today";
import { Button } from "@/shared/ui/button";
import { deleteTask, saveTask } from "../actions/tasks";
import type { TodoPriority } from "../domain/tasks";
import type { TaskInput } from "../schemas/task";
import type { ListItem, TaskItem } from "../view-models";

const inputClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";
const chipClass =
  "rounded-full border px-3 py-1.5 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground";

type Props = {
  /** null = new task (due today, no list). */
  task: TaskItem | null;
  lists: readonly ListItem[];
  onClose: () => void;
};

type Values = { title: string; note: string; dueDate: string; priority: TodoPriority; listId: string };

function initialValues(task: TaskItem | null): Values {
  if (!task) return { title: "", note: "", dueDate: todayIso(), priority: "NORMAL", listId: "" };
  return { title: task.title, note: task.note ?? "", dueDate: task.dueIso ?? "", priority: task.priority, listId: task.listId ?? "" };
}

export function TaskEditor({ task, lists, onClose }: Props) {
  const isNew = task === null;
  const [values, setValues] = useState<Values>(() => initialValues(task));
  const [showNote, setShowNote] = useState(Boolean(task?.note));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);
  const set = (changes: Partial<Values>) => setValues((current) => ({ ...current, ...changes }));

  const submit = (mode: "close" | "continue") =>
    startTransition(async () => {
      const input: TaskInput = { ...values };
      const result = await saveTask(task?.id ?? null, input);
      if (!result.ok) {
        setErrors(result.fieldErrors);
        setFormError(result.error);
        return;
      }
      if (mode === "close") {
        onClose();
        return;
      }
      // Next entry: same date, list and priority; new title.
      setValues((current) => ({ ...current, title: "", note: "" }));
      setShowNote(false);
      setErrors({});
      setFormError(null);
      setSavedCount((count) => count + 1);
      titleRef.current?.focus();
    });

  const remove = () =>
    startTransition(async () => {
      if (!task) return;
      const result = await deleteTask(task.id);
      if (result.ok) onClose();
      else setFormError(result.error);
    });

  const dateChips = [
    { label: "Aujourd'hui", value: today },
    { label: "Demain", value: tomorrow },
    { label: "Sans date", value: "" },
  ];
  const customDate = values.dueDate !== "" && values.dueDate !== today && values.dueDate !== tomorrow;

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          initialFocus={titleRef}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{isNew ? "Nouvelle tâche" : "Modifier la tâche"}</Dialog.Title>
            <Dialog.Close className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted" aria-label="Fermer">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit(isNew ? "continue" : "close");
            }}
          >
            <div className="grid gap-1">
              <label htmlFor="task-title" className="sr-only">
                Tâche
              </label>
              <input
                id="task-title"
                ref={titleRef}
                value={values.title}
                onChange={(event) => set({ title: event.target.value })}
                placeholder="Que faut-il faire ?"
                autoComplete="off"
                enterKeyHint={isNew ? "next" : "done"}
                maxLength={200}
                aria-invalid={errors.title ? true : undefined}
                className={inputClass}
              />
              {errors.title ? <p className="text-sm text-destructive">{errors.title}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Échéance">
              {dateChips.map((chip) => (
                <button key={chip.label} type="button" aria-pressed={values.dueDate === chip.value} onClick={() => set({ dueDate: chip.value })} className={chipClass}>
                  {chip.label}
                </button>
              ))}
              <label className="sr-only" htmlFor="task-date">
                Autre date
              </label>
              <input
                id="task-date"
                type="date"
                value={values.dueDate}
                onChange={(event) => set({ dueDate: event.target.value })}
                className={`h-9 rounded-full border bg-background px-3 text-sm ${customDate ? "border-primary" : "text-muted-foreground"}`}
              />
            </div>
            {errors.dueDate ? <p className="-mt-2 text-sm text-destructive">{errors.dueDate}</p> : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={values.priority === "HIGH"}
                onClick={() => set({ priority: values.priority === "HIGH" ? "NORMAL" : "HIGH" })}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm aria-pressed:border-destructive aria-pressed:bg-destructive/10 aria-pressed:text-destructive"
              >
                <Flag className="size-4" aria-hidden />
                Prioritaire
              </button>
              {lists.length > 0 ? (
                <>
                  <label htmlFor="task-list" className="sr-only">
                    Liste
                  </label>
                  <select
                    id="task-list"
                    value={values.listId}
                    onChange={(event) => set({ listId: event.target.value })}
                    className="h-9 rounded-full border bg-background px-3 text-sm"
                  >
                    <option value="">Sans liste</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              {!showNote ? (
                <button type="button" onClick={() => setShowNote(true)} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  + Note
                </button>
              ) : null}
            </div>
            {errors.listId ? <p className="-mt-2 text-sm text-destructive">{errors.listId}</p> : null}

            {showNote ? (
              <div className="grid gap-1">
                <label htmlFor="task-note" className="text-sm text-muted-foreground">
                  Note
                </label>
                <textarea
                  id="task-note"
                  value={values.note}
                  onChange={(event) => set({ note: event.target.value })}
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                {errors.note ? <p className="text-sm text-destructive">{errors.note}</p> : null}
              </div>
            ) : null}

            {formError && Object.keys(errors).length === 0 ? <p className="text-sm text-destructive">{formError}</p> : null}
            {savedCount > 0 ? (
              <p className="text-sm text-positive" aria-live="polite">
                {savedCount === 1 ? "1 tâche ajoutée" : `${savedCount} tâches ajoutées`}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {isNew ? (
                <>
                  <Button type="submit" size="lg" disabled={pending} className="flex-1">
                    Ajouter et continuer
                  </Button>
                  <Button type="button" size="lg" variant="outline" disabled={pending} onClick={() => submit("close")}>
                    Ajouter
                  </Button>
                </>
              ) : (
                <>
                  <Button type="submit" size="lg" disabled={pending} className="flex-1">
                    Enregistrer
                  </Button>
                  {confirmDelete ? (
                    <Button type="button" size="lg" variant="destructive" disabled={pending} onClick={remove}>
                      Confirmer la suppression
                    </Button>
                  ) : (
                    <Button type="button" size="lg" variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>
                      Supprimer
                    </Button>
                  )}
                </>
              )}
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
