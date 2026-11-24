"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession, startSession } from "@/shared/auth/server";
import { hashPassword, verifyPassword } from "@/shared/auth/password";
import { getProfile, isLoginTaken, setPassword, updateProfile } from "../data/users";
import { loginSchema, nameSchema, passwordSchema } from "../domain/accounts";
import { type ActionResult, failure } from "./result";

const profileSchema = z.object({ name: nameSchema, login: loginSchema });

export async function saveProfile(input: { name: string; login: string }): Promise<ActionResult> {
  const { userId } = await requireSession();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Saisie invalide");
  if (await isLoginTaken(parsed.data.login, userId)) return failure("Cet email est déjà utilisé par un autre compte");
  await updateProfile(userId, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordChangeSchema = z.object({ current: z.string().max(256), next: passwordSchema });

/** Signs out the other devices; this one gets a fresh session. */
export async function changePassword(input: { current: string; next: string }): Promise<ActionResult> {
  const { userId } = await requireSession();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Saisie invalide");
  const profile = await getProfile(userId);
  if (!profile) return failure("Compte introuvable");
  if (profile.passwordHash && !(await verifyPassword(parsed.data.current, profile.passwordHash))) {
    return failure("Mot de passe actuel incorrect");
  }
  const version = await setPassword(userId, await hashPassword(parsed.data.next));
  await startSession({ userId, version });
  revalidatePath("/", "layout");
  return { ok: true };
}
