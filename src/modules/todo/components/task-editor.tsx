"use client";

import { Flag } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { addDaysIso, todayIso } from "@/shared/lib/today";
import { Button } from "@/shared/ui/button";
import { deleteTask, saveTask } from "../actions/tasks";
import type { TodoPriority } from "../domain/tasks";
import type { TaskInput } from "../schemas/task";
import type { ListItem, TaskItem } from "../view-models";
import { Sheet } from "@/shared/ui/sheet";

const inputClass =
  "h-11 w-full rounded-xl bg-muted px-3.5 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive disabled:opacity-50";
const chipClass =
  "inline-flex h-9 items-center rounded-full bg-muted px-3.5 text-[15px] aria-pressed:bg-primary aria-pressed:text-primary-foreground";

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
    <Sheet title={isNew ? "Nouvelle tâche" : "Modifier la tâche"} onClose={onClose} initialFocus={titleRef}>
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
            className={`h-9 rounded-full px-3 text-[15px] ${customDate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          />
        </div>
        {errors.dueDate ? <p className="-mt-2 text-sm text-destructive">{errors.dueDate}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={values.priority === "HIGH"}
            onClick={() => set({ priority: values.priority === "HIGH" ? "NORMAL" : "HIGH" })}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-muted px-3.5 text-[15px] aria-pressed:bg-warning/15 aria-pressed:text-warning"
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
                className="h-9 rounded-full bg-muted px-3 text-[15px]"
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
              className="min-h-24 w-full rounded-xl bg-muted px-3.5 py-2.5 text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
    </Sheet>
  );
}
