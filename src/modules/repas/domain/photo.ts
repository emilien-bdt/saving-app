/** Largest photo accepted by the server (the browser sends ~150-400 Ko after resizing). */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export type PhotoMime = "image/jpeg" | "image/png" | "image/webp";

/** Image type read from the file's first bytes (never trust the name or the browser's type). */
export function detectPhotoMime(bytes: Uint8Array): PhotoMime | null {
  const at = (index: number) => bytes[index] ?? -1;
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}
