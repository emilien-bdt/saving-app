import { db } from "@/shared/lib/db";
import type { InvitationKind } from "../domain/accounts";

export async function createInvitation(data: {
  kind: InvitationKind;
  tokenHash: string;
  createdById: string;
  expiresAt: Date;
  name?: string;
  householdId?: string;
  targetUserId?: string;
}): Promise<void> {
  await db.invitation.create({ data });
}

export function findInvitation(tokenHash: string) {
  return db.invitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      kind: true,
      name: true,
      householdId: true,
      targetUserId: true,
      expiresAt: true,
      usedAt: true,
      createdBy: { select: { name: true } },
      targetUser: { select: { name: true, login: true } },
    },
  });
}

/** Marks the link as used; false when someone used it in the meantime. */
export async function consumeInvitation(id: string): Promise<boolean> {
  const { count } = await db.invitation.updateMany({ where: { id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  return count > 0;
}
