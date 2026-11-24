"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/shared/auth/server";
import { deleteDishPhoto, dishExists, saveDishPhoto } from "../data/photos";
import { detectPhotoMime, MAX_PHOTO_BYTES } from "../domain/photo";
import type { ActionResult } from "./meals";

const failure = (error: string): ActionResult => ({ ok: false, error, fieldErrors: {} });
const idSchema = z.string().min(1).max(64);

function revalidateRepas(): void {
  revalidatePath("/repas", "layout");
  revalidatePath("/");
}

/** Sets (or replaces) the photo of a dish: form field "photo", already resized by the browser. */
export async function uploadDishPhoto(dishId: string, formData: FormData): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(dishId);
  if (!id.success) return failure("Plat invalide");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return failure("Aucune photo reçue");
  if (file.size > MAX_PHOTO_BYTES) return failure("Photo trop lourde (3 Mo maximum)");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectPhotoMime(bytes);
  if (!mime) return failure("Format non pris en charge (JPEG, PNG ou WebP)");
  if (!(await dishExists(id.data))) return failure("Plat introuvable");
  await saveDishPhoto(id.data, mime, bytes);
  revalidateRepas();
  return { ok: true };
}

export async function removeDishPhoto(dishId: string): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(dishId);
  if (!id.success) return failure("Plat invalide");
  await deleteDishPhoto(id.data);
  revalidateRepas();
  return { ok: true };
}
