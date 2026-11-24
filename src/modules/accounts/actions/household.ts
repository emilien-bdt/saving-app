"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/shared/auth/server";
import { leaveHousehold as leave, joinHousehold } from "../data/households";
import { consumeInvitation, createInvitation, findInvitation } from "../data/invitations";
import { invitationExpiry, invitationState } from "../domain/accounts";
import { hashInvitationToken, isTokenShaped, newInvitationToken } from "../domain/tokens";
import { type ActionResult, failure } from "./result";

/** A single-use link (7 days) to join the signed-in person's household. */
export async function createHouseholdInvite(): Promise<ActionResult<{ token: string }>> {
  const { userId, householdId } = await requireSession();
  const token = newInvitationToken();
  await createInvitation({ kind: "HOUSEHOLD", tokenHash: hashInvitationToken(token), createdById: userId, householdId, expiresAt: invitationExpiry("HOUSEHOLD") });
  return { ok: true, token };
}

/** Joins the inviting household (leaving the current one, whose shared data stays there). */
export async function acceptHouseholdInvite(token: string): Promise<ActionResult> {
  const { userId, householdId } = await requireSession();
  if (!isTokenShaped(token)) return failure("Lien invalide");
  const invitation = await findInvitation(hashInvitationToken(token));
  if (!invitation || invitation.kind !== "HOUSEHOLD" || !invitation.householdId) return failure("Lien invalide");
  if (invitationState(invitation) !== "valid") return failure("Ce lien a expiré ou a déjà servi");
  if (invitation.householdId === householdId) return failure("Tu fais déjà partie de ce foyer");
  if (!(await consumeInvitation(invitation.id))) return failure("Ce lien a expiré ou a déjà servi");
  await joinHousehold(userId, invitation.householdId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Back to one's own household; the shared data stays with the household left. */
export async function leaveHousehold(): Promise<ActionResult> {
  const { userId } = await requireSession();
  if (!(await leave(userId))) return failure("Tu es déjà dans ton propre foyer");
  revalidatePath("/", "layout");
  return { ok: true };
}
