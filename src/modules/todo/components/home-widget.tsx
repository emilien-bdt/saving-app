import Link from "next/link";
import type { ReactNode } from "react";
import { todayIso } from "@/shared/lib/today";
import { getLists } from "../data/lists";
import { getOpenTasks } from "../data/tasks";
import { focusTasks, summarizeTasks } from "../domain/tasks";
import { TaskRow } from "./task-row";

/** Home widget: overdue + today's tasks (tickable), and what is coming within 7 days. */
export async function TodoHomeWidget(): Promise<ReactNode> {
  const today = todayIso();
  const [tasks, lists] = await Promise.all([getOpenTasks(), getLists()]);
  const summary = summarizeTasks(tasks, today);
  const focus = focusTasks(tasks, today);
  const hidden = summary.overdue + summary.today - focus.length;
  const listById = new Map(lists.map((list) => [list.id, list]));

  const counts = [
    summary.overdue > 0 ? { text: `${summary.overdue} en retard`, tone: "text-destructive" } : null,
    { text: `${summary.today} aujourd'hui`, tone: "" },
    { text: `${summary.nextSevenDays} dans les 7 jours`, tone: "" },
  ].filter((count) => count !== null);

  return (
    <div className="space-y-2">
      <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        {counts.map((count) => (
          <span key={count.text} className={count.tone}>
            {count.text}
          </span>
        ))}
      </p>
      {focus.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Rien d&apos;urgent pour aujourd&apos;hui.</p>
      ) : (
        <ul className="-mx-1">
          {focus.map((task) => (
            <TaskRow key={task.id} task={task} today={today} list={task.listId ? listById.get(task.listId) : undefined} />
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <Link href="/todo" className="block text-sm text-muted-foreground hover:text-foreground">
          + {hidden} autre{hidden > 1 ? "s" : ""}
        </Link>
      ) : null}
    </div>
  );
}
