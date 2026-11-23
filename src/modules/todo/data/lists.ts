import { db } from "@/shared/lib/db";
import type { ListItem } from "../view-models";

export async function getLists(): Promise<ListItem[]> {
  const [lists, counts] = await Promise.all([
    db.todoList.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.todoTask.groupBy({ by: ["listId"], where: { completedAt: null }, _count: { _all: true } }),
  ]);
  const openByList = new Map(counts.map((row) => [row.listId, row._count._all]));
  return lists.map((list) => ({ id: list.id, name: list.name, color: list.color, openCount: openByList.get(list.id) ?? 0 }));
}

export async function listExists(id: string): Promise<boolean> {
  return (await db.todoList.count({ where: { id } })) > 0;
}

/** Case-insensitive: "Maison" and "maison" are the same list. */
export async function isListNameTaken(name: string, exceptId: string | null): Promise<boolean> {
  const found = await db.todoList.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return found !== null;
}

export async function createList(data: { name: string; color: string }): Promise<void> {
  const last = await db.todoList.aggregate({ _max: { sortOrder: true } });
  await db.todoList.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
}

export async function updateList(id: string, data: { name: string; color: string }): Promise<boolean> {
  const { count } = await db.todoList.updateMany({ where: { id }, data });
  return count > 0;
}

/** The list's tasks are kept, without a list (ON DELETE SET NULL). */
export async function deleteList(id: string): Promise<boolean> {
  const { count } = await db.todoList.deleteMany({ where: { id } });
  return count > 0;
}

/** Swaps the list with its neighbour; renumbers first so the order is always 0..n-1. */
export async function moveList(id: string, direction: "up" | "down"): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const lists = await tx.todoList.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
    const index = lists.findIndex((list) => list.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= lists.length) return false;
    const ids = lists.map((list) => list.id);
    [ids[index], ids[target]] = [ids[target] ?? id, ids[index] ?? id];
    await Promise.all(ids.map((listId, sortOrder) => tx.todoList.update({ where: { id: listId }, data: { sortOrder } })));
    return true;
  });
}
