"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import * as repository from "../data/dishes";
import { AISLE_IDS, ingredientKey, UNIT_IDS } from "../domain/ingredients";
import type { ActionResult } from "./meals";

const failure = (error: string, fieldErrors: Record<string, string> = {}): ActionResult => ({ ok: false, error, fieldErrors });
const idSchema = z.string().min(1).max(64);

function revalidateRepas(): void {
  revalidatePath("/repas", "layout");
  revalidatePath("/");
}

const dishInputSchema = z
  .object({
    name: z.string().trim().min(1, "Nom obligatoire").max(120, "120 caractères maximum"),
    archived: z.boolean(),
    ingredients: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Ingrédient sans nom").max(80, "80 caractères maximum"),
          amount: z.number().int("Quantité entière").positive("Quantité positive").max(100_000).nullable(),
          unit: z.enum(UNIT_IDS),
          aisle: z.enum(AISLE_IDS),
        }),
      )
      .max(40, "40 ingrédients maximum"),
  })
  .refine((dish) => new Set(dish.ingredients.map((item) => ingredientKey(item.name))).size === dish.ingredients.length, {
    message: "Un ingrédient est en double",
    path: ["ingredients"],
  });

export type DishInput = z.input<typeof dishInputSchema>;

export async function saveDish(id: string, input: DishInput): Promise<ActionResult> {
  await requireSession();
  if (!idSchema.safeParse(id).success) return failure("Plat introuvable");
  const parsed = dishInputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Plat invalide";
    return failure(message, { [String(parsed.error.issues[0]?.path[0] ?? "form")]: message });
  }
  const result = await repository.saveDish(id, parsed.data);
  if (!result.ok) {
    return result.reason === "missing"
      ? failure("Ce plat n'existe plus")
      : failure(`« ${result.other} » existe déjà : fusionne les deux plats`, { name: "Nom déjà pris" });
  }
  revalidateRepas();
  return { ok: true };
}

/** Every meal of `sourceId` now points to `targetId`; the source disappears. */
export async function mergeDish(sourceId: string, targetId: string): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ sourceId: idSchema, targetId: idSchema }).safeParse({ sourceId, targetId });
  if (!parsed.success || !(await repository.mergeDishes(parsed.data.sourceId, parsed.data.targetId))) {
    return failure("Fusion impossible");
  }
  revalidateRepas();
  return { ok: true };
}

export async function deleteDish(id: string): Promise<ActionResult> {
  await requireSession();
  if (!idSchema.safeParse(id).success || !(await repository.deleteUnusedDish(id))) {
    return failure("Ce plat a déjà été mangé : archive-le plutôt");
  }
  revalidateRepas();
  return { ok: true };
}
