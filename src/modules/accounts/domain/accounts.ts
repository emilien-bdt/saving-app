import { z } from "zod";

/** Invitation links stay valid this long (single use). */
export const INVITATION_TTL_DAYS = { ACCOUNT: 7, HOUSEHOLD: 7, PASSWORD_RESET: 2 } as const;

export type InvitationKind = keyof typeof INVITATION_TTL_DAYS;

export function invitationExpiry(kind: InvitationKind, now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS[kind] * 24 * 60 * 60 * 1000);
}

/** What the person types to sign in: an email, compared without case or spaces. */
export function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

export const loginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email obligatoire")
  .max(254, "254 caractères maximum")
  .email("Email invalide");

export const passwordSchema = z.string().min(8, "8 caractères minimum").max(256, "256 caractères maximum");

export const nameSchema = z.string().trim().min(1, "Prénom obligatoire").max(60, "60 caractères maximum");

/** Invitation state, from its row (null = unknown link). */
export type InvitationState = "valid" | "used" | "expired" | "unknown";

export function invitationState(invitation: { usedAt: Date | null; expiresAt: Date } | null, now: Date = new Date()): InvitationState {
  if (!invitation) return "unknown";
  if (invitation.usedAt) return "used";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

/**
 * Leaving a household: back to one's own household. A household that is nobody's own
 * and has no member left is deleted with its data (Repas, Courses, shared lists).
 */
export function leavePlan(input: { currentId: string; soloId: string; remainingMembers: number; currentIsSolo: boolean }):
  | { action: "stay"; reason: "already_home" }
  | { action: "leave"; deleteHousehold: boolean } {
  if (input.currentId === input.soloId) return { action: "stay", reason: "already_home" };
  return { action: "leave", deleteHousehold: !input.currentIsSolo && input.remainingMembers === 0 };
}
