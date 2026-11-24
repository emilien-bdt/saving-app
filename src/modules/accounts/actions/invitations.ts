"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appModules } from "@/modules/registry";
import { hashPassword } from "@/shared/auth/password";
import { startSession } from "@/shared/auth/server";
import { consumeInvitation, findInvitation } from "../data/invitations";
import { createUser, isLoginTaken, setPassword } from "../data/users";
import { invitationState, loginSchema, nameSchema, passwordSchema } from "../domain/accounts";
import { hashInvitationToken, isTokenShaped } from "../domain/tokens";
import { failure } from "./result";

export type InvitationFormState = { error: string | null };

async function validInvitation(token: string, kind: "ACCOUNT" | "PASSWORD_RESET") {
  if (!isTokenShaped(token)) return null;
  const invitation = await findInvitation(hashInvitationToken(token));
  return invitation && invitation.kind === kind && invitationState(invitation) === "valid" ? invitation : null;
}

const registerSchema = z.object({ name: nameSchema, login: loginSchema, password: passwordSchema });

/** Public (invitation link): creates the account, its household and its default data, then signs in. */
export async function registerWithInvitation(token: string, _previous: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const invitation = await validInvitation(token, "ACCOUNT");
  if (!invitation) return failure("Ce lien a expiré ou a déjà servi");
  const parsed = registerSchema.safeParse({ name: formData.get("name"), login: formData.get("login"), password: formData.get("password") });
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Saisie invalide");
  if (formData.get("password") !== formData.get("confirm")) return failure("Les deux mots de passe sont différents");
  if (await isLoginTaken(parsed.data.login, null)) return failure("Cet email a déjà un compte");
  if (!(await consumeInvitation(invitation.id))) return failure("Ce lien a expiré ou a déjà servi");

  const user = await createUser({ name: parsed.data.name, login: parsed.data.login, passwordHash: await hashPassword(parsed.data.password) });
  for (const appModule of appModules) await appModule.setupUser?.(user.id);
  await startSession({ userId: user.id, version: user.sessionVersion });
  redirect("/");
}

/** Public (link from the admin): sets a new password, signs out other devices, signs in here. */
export async function resetWithInvitation(token: string, _previous: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const invitation = await validInvitation(token, "PASSWORD_RESET");
  if (!invitation?.targetUserId) return failure("Ce lien a expiré ou a déjà servi");
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return failure(password.error.issues[0]?.message ?? "Mot de passe invalide");
  if (formData.get("password") !== formData.get("confirm")) return failure("Les deux mots de passe sont différents");
  if (!(await consumeInvitation(invitation.id))) return failure("Ce lien a expiré ou a déjà servi");

  const version = await setPassword(invitation.targetUserId, await hashPassword(password.data));
  await startSession({ userId: invitation.targetUserId, version });
  redirect("/");
}
