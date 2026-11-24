"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/shared/lib/db";
import { getAuthConfig } from "./config";
import { verifyPassword } from "./password";
import { safeRedirectPath } from "./redirect";
import { endSession, startSession } from "./server";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  login: z.string({ error: "Email requis" }).trim().toLowerCase().min(1, "Email requis").max(254),
  password: z.string({ error: "Mot de passe requis" }).min(1, "Mot de passe requis").max(256),
  next: z.string().max(2048).optional(),
});

const FAILED_LOGIN_DELAY_MS = 800;

/** The password of the account, or the former single password for the migrated admin without one. */
async function checkPassword(password: string, user: { passwordHash: string | null; role: "ADMIN" | "MEMBER" }): Promise<boolean> {
  if (user.passwordHash) return verifyPassword(password, user.passwordHash);
  const legacy = getAuthConfig().legacyPasswordHash;
  return user.role === "ADMIN" && legacy !== null && verifyPassword(password, legacy);
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
  }

  const user = await db.user.findUnique({
    where: { login: parsed.data.login },
    select: { id: true, passwordHash: true, role: true, active: true, sessionVersion: true },
  });
  const valid = user !== null && user.active && (await checkPassword(parsed.data.password, user));
  if (!user || !valid) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return { error: "Email ou mot de passe incorrect" };
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession({ userId: user.id, version: user.sessionVersion });
  redirect(safeRedirectPath(parsed.data.next));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
