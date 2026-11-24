import Link from "next/link";
import type { ReactNode } from "react";
import { todayIso } from "@/shared/lib/today";
import { ios } from "@/shared/ui/ios";
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
    <div>
      <p className={`${ios.hint} flex flex-wrap gap-x-3`}>
        {counts.map((count) => (
          <span key={count.text} className={count.tone}>
            {count.text}
          </span>
        ))}
      </p>
      {focus.length === 0 ? (
        <p className="py-3 text-[15px] text-muted-foreground">Rien d&apos;urgent pour aujourd&apos;hui.</p>
      ) : (
        <ul className="-mx-2 mt-1 divide-y divide-border">
          {focus.map((task) => (
            <TaskRow key={task.id} task={task} today={today} list={task.listId ? listById.get(task.listId) : undefined} />
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <Link href="/todo" className="mt-1 block text-[15px] text-primary">
          {hidden} autre{hidden > 1 ? "s" : ""} pour aujourd&apos;hui
        </Link>
      ) : null}
    </div>
  );
}
