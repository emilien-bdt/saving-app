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

export type ListItem = {
  id: string;
  name: string;
  color: string;
  openCount: number;
  /** Shared with the household. */
  shared: boolean;
  /** Created by the signed-in person (only they can change the sharing). */
  mine: boolean;
};
