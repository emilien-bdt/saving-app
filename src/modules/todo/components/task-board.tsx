"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { clearCompletedTasks } from "../actions/tasks";
import type { TaskGroup } from "../domain/tasks";
import type { ListItem, TaskItem } from "../view-models";
import { TaskEditor } from "./task-editor";
import { TaskRow } from "./task-row";

type Props = {
  groups: TaskGroup<TaskItem>[];
  completed: { items: TaskItem[]; total: number };
  lists: ListItem[];
  today: string;
  /** ?liste= value of the page (null = all tasks). */
  listParam: string | null;
  showList: boolean;
};

/** Grouped open tasks + recently done ones; tap a task to edit it. */
export function TaskBoard({ groups, completed, lists, today, listParam, showList }: Props) {
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [pending, startTransition] = useTransition();
  const listById = new Map(lists.map((list) => [list.id, list]));
  const row = (task: TaskItem) => (
    <TaskRow key={task.id} task={task} today={today} list={task.listId ? listById.get(task.listId) : undefined} showList={showList} onEdit={setEditing} />
  );

  return (
    <>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Rien à faire ici. Ajoute une tâche avec « + ».</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} aria-labelledby={`group-${group.id}`} className="rounded-xl border bg-card px-2 py-2 sm:px-3">
            <h2
              id={`group-${group.id}`}
              className={`flex items-baseline justify-between px-2 pt-1 text-sm font-semibold ${group.id === "overdue" ? "text-destructive" : ""}`}
            >
              {group.label}
              <span className="text-xs font-normal text-muted-foreground">{group.tasks.length}</span>
            </h2>
            <ul>{group.tasks.map(row)}</ul>
          </section>
        ))
      )}

      {completed.total > 0 ? (
        <details className="rounded-xl border bg-card px-2 py-2 sm:px-3">
          <summary className="cursor-pointer px-2 py-1 text-sm font-semibold">
            Terminées <span className="font-normal text-muted-foreground">({completed.total})</span>
          </summary>
          <ul>{completed.items.map(row)}</ul>
          <div className="flex items-center justify-between gap-2 px-2 pt-2">
            <span className="text-xs text-muted-foreground">
              {completed.total > completed.items.length ? `${completed.items.length} plus récentes affichées` : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => startTransition(async () => void (await clearCompletedTasks(listParam)))}
            >
              Effacer les terminées
            </Button>
          </div>
        </details>
      ) : null}

      {editing ? <TaskEditor key={editing.id} task={editing} lists={lists} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
