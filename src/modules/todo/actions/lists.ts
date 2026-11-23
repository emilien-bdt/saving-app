"use server";

import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import * as repository from "../data/lists";
import { fieldErrorsOf, idSchema, type ListInput, listInputSchema } from "../schemas/task";
import { type ActionResult, failure } from "./result";
import { revalidateTodo } from "./revalidate";

/** id = null creates the list. */
export async function saveList(id: string | null, input: ListInput): Promise<ActionResult> {
  await requireSession();
  if (id !== null && !idSchema.safeParse(id).success) return failure("Liste introuvable");
  const parsed = listInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    return failure(Object.values(fieldErrors)[0] ?? "Liste invalide", fieldErrors);
  }
  if (await repository.isListNameTaken(parsed.data.name, id)) {
    return failure("Une liste porte déjà ce nom", { name: "Une liste porte déjà ce nom" });
  }

  if (id === null) await repository.createList(parsed.data);
  else if (!(await repository.updateList(id, parsed.data))) return failure("Cette liste n'existe plus");
  revalidateTodo();
  return { ok: true };
}

export async function deleteList(id: string): Promise<ActionResult> {
  await requireSession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success || !(await repository.deleteList(parsed.data))) return failure("Cette liste n'existe plus");
  revalidateTodo();
  return { ok: true };
}

export async function moveList(id: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id: idSchema, direction: z.enum(["up", "down"]) }).safeParse({ id, direction });
  if (!parsed.success || !(await repository.moveList(parsed.data.id, parsed.data.direction))) {
    return failure("Déplacement impossible");
  }
  revalidateTodo();
  return { ok: true };
}
