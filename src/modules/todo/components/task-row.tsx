import { Flag, StickyNote } from "lucide-react";
import { type DueTone, dueLabel } from "../domain/tasks";
import type { ListItem, TaskItem } from "../view-models";
import { TaskCheck } from "./task-check";

const TONES: Record<DueTone, string> = {
  overdue: "text-destructive",
  today: "text-primary font-medium",
  soon: "text-foreground",
  normal: "text-muted-foreground",
};

type Props = {
  task: TaskItem;
  today: string;
  list: ListItem | undefined;
  /** Hides the list name (page already filtered on that list). */
  showList?: boolean;
  onEdit?: (task: TaskItem) => void;
};

/** One task as an iOS list row: tick circle, title, due date / list / priority underneath. */
export function TaskRow({ task, today, list, showList = true, onEdit }: Props) {
  const done = task.completedAtIso !== null;
  const due = task.dueIso && !done ? dueLabel(task.dueIso, today) : null;
  const content = (
    <>
      <span className={`block truncate text-[17px] leading-[22px] ${done ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
      {due || (showList && list) || task.note || task.priority === "HIGH" ? (
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-muted-foreground">
          {task.priority === "HIGH" && !done ? (
            <span className="inline-flex items-center gap-1 text-warning">
              <Flag className="size-3" aria-hidden />
              Prioritaire
            </span>
          ) : null}
          {due ? <span className={TONES[due.tone]}>{due.label}</span> : null}
          {showList && list ? (
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: list.color }} aria-hidden />
              {list.name}
            </span>
          ) : null}
          {task.note ? <StickyNote className="size-3" aria-label="Avec une note" /> : null}
        </span>
      ) : null}
    </>
  );

  return (
    <li className="flex items-center gap-0.5 pr-2">
      <TaskCheck id={task.id} done={done} title={task.title} late={due?.tone === "overdue"} />
      {onEdit ? (
        <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 py-2.5 text-left active:opacity-60">
          {content}
        </button>
      ) : (
        <div className="min-w-0 flex-1 py-2.5">{content}</div>
      )}
    </li>
  );
}
