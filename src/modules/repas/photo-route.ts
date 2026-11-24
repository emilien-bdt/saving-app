import { isAuthenticated } from "@/shared/auth/server";
import { getDishPhoto } from "./data/photos";

export async function getDishPhotoResponse(_request: Request, context: { params: Promise<{ dishId: string }> }): Promise<Response> {
  if (!(await isAuthenticated())) return new Response("Non autorisé", { status: 401 });
  const { dishId } = await context.params;
  const photo = await getDishPhoto(dishId);
  if (!photo) return new Response("Introuvable", { status: 404 });
  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.data.byteLength),
      // The URL carries the version (?v=…): safe to keep it for a long time.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
