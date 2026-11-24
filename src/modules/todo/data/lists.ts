import { db } from "@/shared/lib/db";
import type { ListItem } from "../view-models";
import { todoScope } from "./scope";

export async function getLists(): Promise<ListItem[]> {
  const scope = await todoScope();
  const [lists, counts] = await Promise.all([
    db.todoList.findMany({ where: scope.lists, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.todoTask.groupBy({ by: ["listId"], where: { AND: [scope.tasks, { completedAt: null }] }, _count: { _all: true } }),
  ]);
  const openByList = new Map(counts.map((row) => [row.listId, row._count._all]));
  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    color: list.color,
    openCount: openByList.get(list.id) ?? 0,
    shared: list.householdId !== null,
    mine: list.userId === scope.userId,
  }));
}

export async function listExists(id: string): Promise<boolean> {
  const scope = await todoScope();
  return (await db.todoList.count({ where: { AND: [scope.lists, { id }] } })) > 0;
}

/** Case-insensitive, among the lists this person sees: "Maison" and "maison" are the same list. */
export async function isListNameTaken(name: string, exceptId: string | null): Promise<boolean> {
  const scope = await todoScope();
  const found = await db.todoList.findFirst({
    where: { AND: [scope.lists, { name: { equals: name, mode: "insensitive" } }, ...(exceptId ? [{ NOT: { id: exceptId } }] : [])] },
    select: { id: true },
  });
  return found !== null;
}

export async function createList(data: { name: string; color: string; shared: boolean }): Promise<void> {
  const scope = await todoScope();
  const last = await db.todoList.aggregate({ where: scope.lists, _max: { sortOrder: true } });
  await db.todoList.create({
    data: {
      name: data.name,
      color: data.color,
      userId: scope.userId,
      householdId: data.shared ? scope.householdId : null,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
  });
}

/** Only its creator can share a list with the household or make it personal again. */
export async function updateList(id: string, data: { name: string; color: string; shared: boolean }): Promise<boolean> {
  const scope = await todoScope();
  const list = await db.todoList.findFirst({ where: { AND: [scope.lists, { id }] }, select: { userId: true } });
  if (!list) return false;
  const sharing = list.userId === scope.userId ? { householdId: data.shared ? scope.householdId : null } : {};
  await db.todoList.update({ where: { id }, data: { name: data.name, color: data.color, ...sharing } });
  return true;
}

/** The list's tasks are kept, without a list (ON DELETE SET NULL). */
export async function deleteList(id: string): Promise<boolean> {
  const scope = await todoScope();
  const { count } = await db.todoList.deleteMany({ where: { AND: [scope.lists, { id }] } });
  return count > 0;
}

/** Swaps the list with its neighbour; renumbers first so the order is always 0..n-1. */
export async function moveList(id: string, direction: "up" | "down"): Promise<boolean> {
  const scope = await todoScope();
  return db.$transaction(async (tx) => {
    const lists = await tx.todoList.findMany({ where: scope.lists, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
    const index = lists.findIndex((list) => list.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= lists.length) return false;
    const ids = lists.map((list) => list.id);
    [ids[index], ids[target]] = [ids[target] ?? id, ids[index] ?? id];
    await Promise.all(ids.map((listId, sortOrder) => tx.todoList.update({ where: { id: listId }, data: { sortOrder } })));
    return true;
  });
}
