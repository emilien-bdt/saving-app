"use server";

import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import { listExists } from "../data/lists";
import * as repository from "../data/tasks";
import { parseListFilter } from "../domain/list-filter";
import { fieldErrorsOf, idSchema, type TaskInput, taskInputSchema } from "../schemas/task";
import { type ActionResult, failure } from "./result";
import { revalidateTodo } from "./revalidate";

/** id = null creates the task. */
export async function saveTask(id: string | null, input: TaskInput): Promise<ActionResult> {
  await requireSession();
  if (id !== null && !idSchema.safeParse(id).success) return failure("Tâche introuvable");
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    return failure(Object.values(fieldErrors)[0] ?? "Tâche invalide", fieldErrors);
  }
  if (parsed.data.listId && !(await listExists(parsed.data.listId))) {
    return failure("Cette liste n'existe plus", { listId: "Cette liste n'existe plus" });
  }

  if (id === null) await repository.createTask(parsed.data);
  else if (!(await repository.updateTask(id, parsed.data))) return failure("Cette tâche n'existe plus");
  revalidateTodo();
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id: idSchema, done: z.boolean() }).safeParse({ id, done });
  if (!parsed.success || !(await repository.setTaskCompleted(parsed.data.id, parsed.data.done))) {
    return failure("Cette tâche n'existe plus");
  }
  revalidateTodo();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await requireSession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success || !(await repository.deleteTask(parsed.data))) return failure("Cette tâche n'existe plus");
  revalidateTodo();
  return { ok: true };
}

/** listParam = the page's ?liste= value (same filter as the list shown). */
export async function clearCompletedTasks(listParam: string | null): Promise<ActionResult> {
  await requireSession();
  const parsed = z.string().max(64).nullable().safeParse(listParam);
  if (!parsed.success) return failure("Filtre invalide");
  await repository.deleteCompletedTasks(parseListFilter(parsed.data ?? undefined));
  revalidateTodo();
  return { ok: true };
}
