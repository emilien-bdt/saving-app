import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt (Node built-in, no dependency).
 * Stored format: "scrypt:<N>:<r>:<p>:<salt b64url>:<hash b64url>".
 * No "$" on purpose: Next.js expands "$VAR" inside .env files.
 * Keep in sync with scripts/hash-password.mjs (checked by password.test.ts).
 */

const DEFAULT_PARAMS = { N: 2 ** 14, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

type ScryptParams = { N: number; r: number; p: number };

function deriveKey(password: string, salt: Buffer, keyLength: number, params: ScryptParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { ...params, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH, DEFAULT_PARAMS);
  const { N, r, p } = DEFAULT_PARAMS;
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

/** Returns false (never throws) for a wrong password or a malformed stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (![N, r, p].every((value) => Number.isInteger(value) && value > 0)) return false;
  if (!saltRaw || !hashRaw) return false;

  const salt = Buffer.from(saltRaw, "base64url");
  const expected = Buffer.from(hashRaw, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await deriveKey(password, salt, expected.length, { N, r, p });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
