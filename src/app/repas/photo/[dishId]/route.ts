import { getDishPhotoResponse } from "@/modules/repas/photo-route";

/** GET /repas/photo/<dishId>?v=<version>: the dish photo (private, cached once per version). */
export const GET = getDishPhotoResponse;
