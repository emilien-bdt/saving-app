import { describe, expect, it } from "vitest";
import { createSessionToken, SESSION_TTL_SECONDS, verifySessionToken } from "./session";

const SECRET = "a-test-secret-that-is-long-enough-123456";
const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);
const SUBJECT = { userId: "ckuser123", version: 2 };

describe("session tokens", () => {
  it("accepts a fresh token and returns its user", async () => {
    const token = await createSessionToken(SECRET, SUBJECT, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + 1000)).toEqual(SUBJECT);
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(SECRET, SUBJECT, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(SECRET, SUBJECT, NOW);
    expect(await verifySessionToken(token, `${SECRET}-other`, NOW)).toBeNull();
  });

  it("rejects a token whose user, version or expiry was tampered with", async () => {
    const [v, user, version, expiresAt, signature] = (await createSessionToken(SECRET, SUBJECT, NOW)).split(".");
    expect(await verifySessionToken(`${v}.other.${version}.${expiresAt}.${signature}`, SECRET, NOW)).toBeNull();
    expect(await verifySessionToken(`${v}.${user}.3.${expiresAt}.${signature}`, SECRET, NOW)).toBeNull();
    expect(await verifySessionToken(`${v}.${user}.${version}.${Number(expiresAt) + 1_000_000}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it.each(["", "abc", "v1.9999999999.abc", "v2.u.1.123", "v2.u.x.9999999999.abc", "v2.u.1.9999999999.!!!", "v2..1.9999999999.abc"])(
    "rejects malformed token %j",
    async (token) => {
      expect(await verifySessionToken(token, SECRET, NOW)).toBeNull();
    },
  );
});
