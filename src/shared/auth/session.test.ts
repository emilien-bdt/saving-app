import { describe, expect, it } from "vitest";
import { createSessionToken, SESSION_TTL_SECONDS, verifySessionToken } from "./session";

const SECRET = "a-test-secret-that-is-long-enough-123456";
const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);

describe("session tokens", () => {
  it("accepts a fresh token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + 1000)).toBe(true);
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000)).toBe(false);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, `${SECRET}-other`, NOW)).toBe(false);
  });

  it("rejects a token whose expiry was tampered with", async () => {
    const [version, expiresAt, signature] = (await createSessionToken(SECRET, NOW)).split(".");
    const forged = `${version}.${Number(expiresAt) + 1_000_000}.${signature}`;
    expect(await verifySessionToken(forged, SECRET, NOW)).toBe(false);
  });

  it.each(["", "abc", "v1.123", "v2.9999999999.abc", "v1.abc.def", "v1.9999999999.!!!", "v1.9999999999."])(
    "rejects malformed token %j",
    async (token) => {
      expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
    },
  );
});
