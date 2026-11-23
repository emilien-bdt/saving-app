/** Pure To do logic: grouping by due date, due labels, ordering, home summary. */

export type TodoPriority = "NORMAL" | "HIGH";

/** Minimal shape the logic needs (dates as "AAAA-MM-JJ"). */
export type TaskLike = {
  id: string;
  dueIso: string | null;
  priority: TodoPriority;
  createdAtIso: string;
};

export type TaskGroupId = "overdue" | "today" | "tomorrow" | "week" | "later" | "noDate";

export const TASK_GROUP_LABELS: Record<TaskGroupId, string> = {
  overdue: "En retard",
  today: "Aujourd'hui",
  tomorrow: "Demain",
  week: "Cette semaine",
  later: "Plus tard",
  noDate: "Sans date",
};

const GROUP_ORDER: readonly TaskGroupId[] = ["overdue", "today", "tomorrow", "week", "later", "noDate"];
const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;

const DAY_MS = 86_400_000;
/** daysBetween("2026-11-23", "2026-11-25") → 2. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

export function groupOf(dueIso: string | null, todayIso: string): TaskGroupId {
  if (dueIso === null) return "noDate";
  const days = daysBetween(todayIso, dueIso);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "week";
  return "later";
}

/** High priority first, then earliest due date (no date last), then oldest. */
export function compareTasks(a: TaskLike, b: TaskLike): number {
  if (a.priority !== b.priority) return a.priority === "HIGH" ? -1 : 1;
  if (a.dueIso !== b.dueIso) {
    if (a.dueIso === null) return 1;
    if (b.dueIso === null) return -1;
    return a.dueIso < b.dueIso ? -1 : 1;
  }
  return a.createdAtIso < b.createdAtIso ? -1 : a.createdAtIso > b.createdAtIso ? 1 : a.id.localeCompare(b.id);
}

export type TaskGroup<T> = { id: TaskGroupId; label: string; tasks: T[] };

/** Open tasks in display order, empty groups left out. */
export function groupOpenTasks<T extends TaskLike>(tasks: readonly T[], todayIso: string): TaskGroup<T>[] {
  const byGroup = new Map<TaskGroupId, T[]>();
  for (const task of tasks) {
    const id = groupOf(task.dueIso, todayIso);
    const list = byGroup.get(id) ?? [];
    list.push(task);
    byGroup.set(id, list);
  }
  return GROUP_ORDER.flatMap((id) => {
    const list = byGroup.get(id);
    return list ? [{ id, label: TASK_GROUP_LABELS[id], tasks: [...list].sort(compareTasks) }] : [];
  });
}

export type DueTone = "overdue" | "today" | "soon" | "normal";

/** "Aujourd'hui", "Demain", "Hier", "Il y a 3 j", "Vendredi" (within a week), "05/12", "05/12/2027". */
export function dueLabel(dueIso: string, todayIso: string): { label: string; tone: DueTone } {
  const days = daysBetween(todayIso, dueIso);
  if (days === 0) return { label: "Aujourd'hui", tone: "today" };
  if (days === 1) return { label: "Demain", tone: "soon" };
  if (days === -1) return { label: "Hier", tone: "overdue" };
  if (days < 0) return { label: `Il y a ${-days} j`, tone: "overdue" };
  const [year, month, day] = dueIso.split("-");
  if (days <= 6) {
    const weekday = WEEKDAYS[new Date(`${dueIso}T00:00:00Z`).getUTCDay()] ?? "";
    return { label: weekday, tone: "soon" };
  }
  const sameYear = year === todayIso.slice(0, 4);
  return { label: sameYear ? `${day}/${month}` : `${day}/${month}/${year}`, tone: "normal" };
}

export type TodoSummary = {
  open: number;
  overdue: number;
  today: number;
  /** Due from tomorrow to today + 7. */
  nextSevenDays: number;
};

export function summarizeTasks(tasks: readonly TaskLike[], todayIso: string): TodoSummary {
  const summary: TodoSummary = { open: tasks.length, overdue: 0, today: 0, nextSevenDays: 0 };
  for (const task of tasks) {
    const group = groupOf(task.dueIso, todayIso);
    if (group === "overdue") summary.overdue += 1;
    else if (group === "today") summary.today += 1;
    else if (group === "tomorrow" || group === "week") summary.nextSevenDays += 1;
  }
  return summary;
}

/** Tasks to show on the home page: overdue + today, most urgent first. */
export function focusTasks<T extends TaskLike>(tasks: readonly T[], todayIso: string, limit = 6): T[] {
  return tasks
    .filter((task) => {
      const group = groupOf(task.dueIso, todayIso);
      return group === "overdue" || group === "today";
    })
    .sort((a, b) => {
      // Oldest due date first here (overdue before today), then the usual order.
      if (a.dueIso !== b.dueIso && a.dueIso && b.dueIso) return a.dueIso < b.dueIso ? -1 : 1;
      return compareTasks(a, b);
    })
    .slice(0, limit);
}
