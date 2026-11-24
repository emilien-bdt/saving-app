"use client";

import { useState, useTransition } from "react";
import { ios } from "@/shared/ui/ios";
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
        <p className={ios.empty}>Rien à faire ici. Ajoute une tâche avec « + ».</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <h2 id={`group-${group.id}`} className={`${ios.sectionLabel} flex justify-between ${group.id === "overdue" ? "text-destructive" : ""}`}>
              {group.label}
              <span className="normal-case">{group.tasks.length}</span>
            </h2>
            <ul className={ios.group}>{group.tasks.map(row)}</ul>
          </section>
        ))
      )}

      {completed.total > 0 ? (
        <details className="group">
          <summary className={`${ios.sectionLabel} flex cursor-pointer list-none justify-between [&::-webkit-details-marker]:hidden`}>
            <span>Terminées ({completed.total})</span>
            <span className="text-primary normal-case group-open:hidden">Afficher</span>
            <span className="hidden text-primary normal-case group-open:inline">Masquer</span>
          </summary>
          <ul className={ios.group}>{completed.items.map(row)}</ul>
          <div className="flex items-center justify-between gap-2 px-4 pt-2">
            <span className={ios.hint}>{completed.total > completed.items.length ? `${completed.items.length} plus récentes affichées` : ""}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => void (await clearCompletedTasks(listParam)))}
              className="text-[15px] text-destructive disabled:opacity-40"
            >
              Effacer les terminées
            </button>
          </div>
        </details>
      ) : null}

      {editing ? <TaskEditor key={editing.id} task={editing} lists={lists} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
