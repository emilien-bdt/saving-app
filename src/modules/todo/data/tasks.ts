import { db } from "@/shared/lib/db";
import type { ParsedListFilter } from "../domain/list-filter";
import type { ParsedTaskInput } from "../schemas/task";
import type { TaskItem } from "../view-models";
import { todoScope } from "./scope";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

type TaskRow = {
  id: string;
  title: string;
  note: string | null;
  dueDate: Date | null;
  priority: TaskItem["priority"];
  listId: string | null;
  completedAt: Date | null;
  createdAt: Date;
};

function toItem(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    dueIso: row.dueDate ? isoDate(row.dueDate) : null,
    priority: row.priority,
    listId: row.listId,
    completedAtIso: row.completedAt ? row.completedAt.toISOString() : null,
    createdAtIso: row.createdAt.toISOString(),
  };
}

function listWhere(filter: ParsedListFilter) {
  if (filter.kind === "none") return { listId: null };
  if (filter.kind === "list") return { listId: filter.id };
  return {};
}

/** Every open task (a personal to-do list stays small): sorted by the domain. */
export async function getOpenTasks(filter: ParsedListFilter = { kind: "all" }): Promise<TaskItem[]> {
  const scope = await todoScope();
  const rows = await db.todoTask.findMany({ where: { AND: [scope.tasks, { completedAt: null, ...listWhere(filter) }] } });
  return rows.map(toItem);
}

/** Most recently ticked tasks. */
export async function getCompletedTasks(filter: ParsedListFilter, limit = 30): Promise<{ items: TaskItem[]; total: number }> {
  const scope = await todoScope();
  const where = { AND: [scope.tasks, { completedAt: { not: null }, ...listWhere(filter) }] };
  const [rows, total] = await Promise.all([
    db.todoTask.findMany({ where, orderBy: { completedAt: "desc" }, take: limit }),
    db.todoTask.count({ where }),
  ]);
  return { items: rows.map(toItem), total };
}

export async function createTask(data: ParsedTaskInput): Promise<void> {
  const scope = await todoScope();
  await db.todoTask.create({ data: { ...data, userId: scope.userId } });
}

/** false when the task no longer exists. */
export async function updateTask(id: string, data: ParsedTaskInput): Promise<boolean> {
  const scope = await todoScope();
  const { count } = await db.todoTask.updateMany({ where: { AND: [scope.tasks, { id }] }, data });
  return count > 0;
}

export async function setTaskCompleted(id: string, done: boolean): Promise<boolean> {
  const scope = await todoScope();
  const { count } = await db.todoTask.updateMany({ where: { AND: [scope.tasks, { id }] }, data: { completedAt: done ? new Date() : null } });
  return count > 0;
}

export async function deleteTask(id: string): Promise<boolean> {
  const scope = await todoScope();
  const { count } = await db.todoTask.deleteMany({ where: { AND: [scope.tasks, { id }] } });
  return count > 0;
}

/** Removes every ticked task (of a list, or all). Returns how many. */
export async function deleteCompletedTasks(filter: ParsedListFilter): Promise<number> {
  const scope = await todoScope();
  const { count } = await db.todoTask.deleteMany({ where: { AND: [scope.tasks, { completedAt: { not: null }, ...listWhere(filter) }] } });
  return count;
}
