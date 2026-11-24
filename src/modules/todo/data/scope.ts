import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/shared/auth/server";

/**
 * What the signed-in person sees: their personal lists and tasks, plus the lists shared
 * with their current household (and every task in them, whoever created it).
 */
export async function todoScope() {
  const { userId, householdId } = await requireSession();
  const lists: Prisma.TodoListWhereInput = { OR: [{ userId, householdId: null }, { householdId }] };
  const tasks: Prisma.TodoTaskWhereInput = {
    OR: [{ list: { householdId } }, { userId, OR: [{ listId: null }, { list: { householdId: null } }] }],
  };
  return { userId, householdId, lists, tasks };
}
