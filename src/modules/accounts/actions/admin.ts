"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appModules } from "@/modules/registry";
import { requireAdmin } from "@/shared/auth/server";
import { createInvitation } from "../data/invitations";
import { findMember, setActive, setDisabledModules } from "../data/users";
import { invitationExpiry, nameSchema } from "../domain/accounts";
import { hashInvitationToken, newInvitationToken } from "../domain/tokens";
import { type ActionResult, failure } from "./result";

const idSchema = z.string().min(1).max(64);

/** Link for a new person to create their account (7 days, single use). */
export async function inviteMember(name: string): Promise<ActionResult<{ token: string }>> {
  const admin = await requireAdmin();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Prénom invalide");
  const token = newInvitationToken();
  await createInvitation({ kind: "ACCOUNT", tokenHash: hashInvitationToken(token), createdById: admin.userId, name: parsed.data, expiresAt: invitationExpiry("ACCOUNT") });
  return { ok: true, token };
}

/** Link for a member to choose a new password (2 days). The admin never sees passwords. */
export async function createPasswordReset(userId: string): Promise<ActionResult<{ token: string }>> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(userId);
  if (!id.success || !(await findMember(id.data))) return failure("Compte introuvable");
  const token = newInvitationToken();
  await createInvitation({ kind: "PASSWORD_RESET", tokenHash: hashInvitationToken(token), createdById: admin.userId, targetUserId: id.data, expiresAt: invitationExpiry("PASSWORD_RESET") });
  return { ok: true, token };
}

export async function setMemberActive(userId: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(userId);
  if (!id.success) return failure("Compte introuvable");
  if (id.data === admin.userId) return failure("Tu ne peux pas désactiver ton propre compte");
  const member = await findMember(id.data);
  if (!member) return failure("Compte introuvable");
  await setActive(id.data, active);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setMemberModules(userId: string, enabledModules: string[]): Promise<ActionResult> {
  await requireAdmin();
  const id = idSchema.safeParse(userId);
  if (!id.success || !(await findMember(id.data))) return failure("Compte introuvable");
  const known = appModules.map((module) => module.id);
  const enabled = z.array(z.enum(known as [string, ...string[]])).max(known.length).safeParse(enabledModules);
  if (!enabled.success) return failure("Module inconnu");
  await setDisabledModules(id.data, known.filter((moduleId) => !enabled.data.includes(moduleId)));
  revalidatePath("/admin");
  return { ok: true };
}
