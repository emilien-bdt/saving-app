import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/shared/lib/db";
import { getAuthConfig, SESSION_COOKIE } from "./config";
import { createSessionToken, SESSION_TTL_SECONDS, type SessionSubject, verifySessionToken } from "./session";

/** Who is signed in, and which data they see (étape 20). */
export type Scope = {
  userId: string;
  /** Current household: Repas, Courses and shared To do lists belong to it. */
  householdId: string;
  role: "ADMIN" | "MEMBER";
  name: string;
  login: string;
  /** Module ids the admin turned off for this person. */
  disabledModules: readonly string[];
};

async function readSessionSubject(): Promise<SessionSubject | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token, getAuthConfig().sessionSecret) : null;
}

/** The signed-in user (once per request), or null: no cookie, bad token, deactivated user or session revoked. */
export const getCurrentUser = cache(async (): Promise<Scope | null> => {
  const subject = await readSessionSubject();
  if (!subject) return null;
  const user = await db.user.findUnique({
    where: { id: subject.userId },
    select: { id: true, householdId: true, role: true, name: true, login: true, disabledModules: true, active: true, sessionVersion: true },
  });
  if (!user || !user.active || user.sessionVersion !== subject.version) return null;
  return {
    userId: user.id,
    householdId: user.householdId,
    role: user.role,
    name: user.name,
    login: user.login,
    disabledModules: user.disabledModules,
  };
});

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

/**
 * Call at the top of every Server Action (and sensitive page): Server Actions
 * are public POST endpoints, the proxy alone is not a sufficient guard.
 * Returns the scope used by the data layer.
 */
export async function requireSession(): Promise<Scope> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Same as requireSession, for the admin pages and actions. */
export async function requireAdmin(): Promise<Scope> {
  const user = await requireSession();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** Module pages: a module the admin turned off for this person is not reachable. */
export async function requireModule(moduleId: string): Promise<Scope> {
  const user = await requireSession();
  if (user.disabledModules.includes(moduleId)) redirect("/");
  return user;
}

export async function startSession(subject: SessionSubject): Promise<void> {
  const token = await createSessionToken(getAuthConfig().sessionSecret, subject);
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
