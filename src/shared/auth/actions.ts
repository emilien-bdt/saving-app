"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthConfig } from "./config";
import { verifyPassword } from "./password";
import { safeRedirectPath } from "./redirect";
import { endSession, startSession } from "./server";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  password: z.string({ error: "Mot de passe requis" }).min(1, "Mot de passe requis").max(256),
  next: z.string().max(2048).optional(),
});

const FAILED_LOGIN_DELAY_MS = 800;

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Saisie invalide" };
  }

  const valid = await verifyPassword(parsed.data.password, getAuthConfig().passwordHash);
  if (!valid) {
    // Slows down brute force attempts.
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return { error: "Mot de passe incorrect" };
  }

  await startSession();
  redirect(safeRedirectPath(parsed.data.next));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
