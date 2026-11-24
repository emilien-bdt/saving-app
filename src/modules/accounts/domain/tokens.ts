import { createHash, randomBytes } from "node:crypto";

/** Secret of an invitation link (256 bits, URL-safe). */
export function newInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored: a database leak does not leak usable links. */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isTokenShaped(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
