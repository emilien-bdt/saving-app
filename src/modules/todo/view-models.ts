import type { TodoPriority } from "./domain/tasks";

/** Task as the pages and client components see it (plain, serializable). */
export type TaskItem = {
  id: string;
  title: string;
  note: string | null;
  dueIso: string | null;
  priority: TodoPriority;
  listId: string | null;
  completedAtIso: string | null;
  createdAtIso: string;
};

export type ListItem = { id: string; name: string; color: string; openCount: number };
