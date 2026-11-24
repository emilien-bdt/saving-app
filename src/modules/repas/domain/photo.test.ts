import { describe, expect, it } from "vitest";
import { detectPhotoMime } from "./photo";

describe("detectPhotoMime", () => {
  it("reconnaît JPEG, PNG et WebP par leurs premiers octets", () => {
    expect(detectPhotoMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectPhotoMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
    expect(detectPhotoMime(webp)).toBe("image/webp");
  });

  it("refuse le reste (HEIC, GIF, texte, vide)", () => {
    expect(detectPhotoMime(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectPhotoMime(new TextEncoder().encode("<svg"))).toBeNull();
    expect(detectPhotoMime(new Uint8Array([]))).toBeNull();
  });
});
