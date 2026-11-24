import { db } from "@/shared/lib/db";

/** URL of a dish photo; the version makes the browser fetch it again after a change. */
export function dishPhotoUrl(dishId: string, updatedAt: Date): string {
  return `/repas/photo/${dishId}?v=${updatedAt.getTime()}`;
}

export function getDishPhoto(dishId: string) {
  return db.repasDishPhoto.findUnique({ where: { dishId }, select: { mimeType: true, data: true, updatedAt: true } });
}

export async function saveDishPhoto(dishId: string, mimeType: string, data: Uint8Array<ArrayBuffer>): Promise<void> {
  await db.repasDishPhoto.upsert({ where: { dishId }, create: { dishId, mimeType, data }, update: { mimeType, data } });
}

export async function deleteDishPhoto(dishId: string): Promise<void> {
  await db.repasDishPhoto.deleteMany({ where: { dishId } });
}

export async function dishExists(dishId: string): Promise<boolean> {
  return (await db.repasDish.count({ where: { id: dishId } })) > 0;
}
