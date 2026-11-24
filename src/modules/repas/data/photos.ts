import { requireSession } from "@/shared/auth/server";
import { db } from "@/shared/lib/db";

/** URL of a dish photo; the version makes the browser fetch it again after a change. */
export function dishPhotoUrl(dishId: string, updatedAt: Date): string {
  return `/repas/photo/${dishId}?v=${updatedAt.getTime()}`;
}

export async function getDishPhoto(dishId: string) {
  const { householdId } = await requireSession();
  return db.repasDishPhoto.findFirst({ where: { dishId, dish: { householdId } }, select: { mimeType: true, data: true, updatedAt: true } });
}

export async function saveDishPhoto(dishId: string, mimeType: string, data: Uint8Array<ArrayBuffer>): Promise<void> {
  await db.repasDishPhoto.upsert({ where: { dishId }, create: { dishId, mimeType, data }, update: { mimeType, data } });
}

export async function deleteDishPhoto(dishId: string): Promise<void> {
  const { householdId } = await requireSession();
  await db.repasDishPhoto.deleteMany({ where: { dishId, dish: { householdId } } });
}

export async function dishExists(dishId: string): Promise<boolean> {
  const { householdId } = await requireSession();
  return (await db.repasDish.count({ where: { id: dishId, householdId } })) > 0;
}
