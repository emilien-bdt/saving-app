/**
 * Stateless session tokens signed with HMAC-SHA256 (Web Crypto only, so this
 * file runs in the proxy, in Server Actions and in tests).
 *
 * Token format: "v2.<userId>.<sessionVersion>.<expiresAtSeconds>.<base64url signature>".
 * The proxy only checks the signature and the expiry; the server also checks that the
 * user is still active and that the session version was not bumped (scope.ts).
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const TOKEN_VERSION = "v2";
const encoder = new TextEncoder();

export type SessionSubject = { userId: string; version: number };

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  try {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

const USER_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Creates a signed session token for a user, valid for SESSION_TTL_SECONDS. */
export async function createSessionToken(secret: string, subject: SessionSubject, nowMs: number = Date.now()): Promise<string> {
  if (!USER_ID.test(subject.userId) || !Number.isInteger(subject.version) || subject.version < 0) {
    throw new Error("Invalid session subject");
  }
  const expiresAt = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payload = `${TOKEN_VERSION}.${subject.userId}.${subject.version}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the session's user when the token is well-formed, correctly signed and not expired. */
export async function verifySessionToken(token: string, secret: string, nowMs: number = Date.now()): Promise<SessionSubject | null> {
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [tokenVersion, userId, versionRaw, expiresAtRaw, signatureRaw] = parts;
  if (tokenVersion !== TOKEN_VERSION || !userId || !USER_ID.test(userId)) return null;
  if (!versionRaw || !/^\d{1,9}$/.test(versionRaw) || !expiresAtRaw || !/^\d{1,12}$/.test(expiresAtRaw)) return null;
  if (Number(expiresAtRaw) <= Math.floor(nowMs / 1000)) return null;

  const signature = signatureRaw ? fromBase64Url(signatureRaw) : null;
  if (!signature) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await importKey(secret),
    signature,
    encoder.encode(`${tokenVersion}.${userId}.${versionRaw}.${expiresAtRaw}`),
  );
  return valid ? { userId, version: Number(versionRaw) } : null;
}
