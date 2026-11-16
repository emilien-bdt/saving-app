import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfig, SESSION_COOKIE } from "./config";
import { createSessionToken, SESSION_TTL_SECONDS, verifySessionToken } from "./session";

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token, getAuthConfig().sessionSecret) : false;
}

/**
 * Call at the top of every Server Action (and sensitive page): Server Actions
 * are public POST endpoints, the proxy alone is not a sufficient guard.
 */
export async function requireSession(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/login");
}

export async function startSession(): Promise<void> {
  const token = await createSessionToken(getAuthConfig().sessionSecret);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
