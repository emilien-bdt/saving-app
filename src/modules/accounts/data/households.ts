import { db } from "@/shared/lib/db";
import { leavePlan } from "../domain/accounts";

/** Members of a household (names only), to show on the Foyer screen of its members. */
export function getHouseholdMembers(householdId: string) {
  return db.user.findMany({
    where: { householdId, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}

export async function getHomeOf(userId: string): Promise<{ soloId: string | null; currentId: string }> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { householdId: true, soloHousehold: { select: { id: true } } } });
  return { soloId: user.soloHousehold?.id ?? null, currentId: user.householdId };
}

/**
 * Leaves the current household for `targetId` (another household, or one's own).
 * The household left is deleted with its data only when it is nobody's own and empty.
 */
async function moveUser(userId: string, targetId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { householdId: true } });
    const previousId = user.householdId;
    if (previousId === targetId) return;
    await tx.user.update({ where: { id: userId }, data: { householdId: targetId } });
    const previous = await tx.household.findUniqueOrThrow({
      where: { id: previousId },
      select: { soloOwnerId: true, _count: { select: { members: true } } },
    });
    const plan = leavePlan({ currentId: previousId, soloId: targetId, remainingMembers: previous._count.members, currentIsSolo: previous.soloOwnerId !== null });
    if (plan.action === "leave" && plan.deleteHousehold) {
      // Meals reference dishes (RESTRICT): remove them first, the cascade does the rest.
      await tx.repasMeal.deleteMany({ where: { householdId: previousId } });
      await tx.household.delete({ where: { id: previousId } });
    }
  });
}

export async function joinHousehold(userId: string, householdId: string): Promise<void> {
  await moveUser(userId, householdId);
}

/** Back to one's own household. false when already there. */
export async function leaveHousehold(userId: string): Promise<boolean> {
  const { soloId, currentId } = await getHomeOf(userId);
  if (!soloId || soloId === currentId) return false;
  await moveUser(userId, soloId);
  return true;
}
