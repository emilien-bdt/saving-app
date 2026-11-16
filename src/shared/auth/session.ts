/**
 * Stateless session tokens signed with HMAC-SHA256 (Web Crypto only, so this
 * file runs in the proxy, in Server Actions and in tests).
 *
 * Token format: "v1.<expiresAtSeconds>.<base64url signature>"
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const TOKEN_VERSION = "v1";
const encoder = new TextEncoder();

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
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Creates a signed session token valid for SESSION_TTL_SECONDS. */
export async function createSessionToken(secret: string, nowMs: number = Date.now()): Promise<string> {
  const expiresAt = Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns true when the token is well-formed, correctly signed and not expired. */
export async function verifySessionToken(
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAtRaw, signatureRaw] = parts;
  if (version !== TOKEN_VERSION || !expiresAtRaw || !/^\d{1,12}$/.test(expiresAtRaw)) return false;
  if (Number(expiresAtRaw) <= Math.floor(nowMs / 1000)) return false;

  const signature = signatureRaw ? fromBase64Url(signatureRaw) : null;
  if (!signature) return false;

  // subtle.verify compares in constant time.
  return crypto.subtle.verify(
    "HMAC",
    await importKey(secret),
    signature,
    encoder.encode(`${version}.${expiresAtRaw}`),
  );
}
