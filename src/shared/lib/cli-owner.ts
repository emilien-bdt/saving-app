import { db } from "./db";

/**
 * Command-line scripts (imports, seed) have no session: they write the admin's data
 * (the first admin account, created by the accounts migration).
 */
export async function getCliOwner(): Promise<{ userId: string; householdId: string }> {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true, householdId: true } });
  if (!admin) throw new Error("Aucun compte admin : lance d'abord les migrations (npm run db:migrate)");
  return { userId: admin.id, householdId: admin.householdId };
}
