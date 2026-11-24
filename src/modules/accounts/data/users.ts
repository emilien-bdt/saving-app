import { db } from "@/shared/lib/db";

export type LoginCandidate = { id: string; passwordHash: string | null; role: "ADMIN" | "MEMBER"; active: boolean; sessionVersion: number };

export function findUserByLogin(login: string): Promise<LoginCandidate | null> {
  return db.user.findUnique({ where: { login }, select: { id: true, passwordHash: true, role: true, active: true, sessionVersion: true } });
}

export async function recordLogin(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function isLoginTaken(login: string, exceptUserId: string | null): Promise<boolean> {
  const user = await db.user.findUnique({ where: { login }, select: { id: true } });
  return user !== null && user.id !== exceptUserId;
}

export function getProfile(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { name: true, login: true, passwordHash: true, role: true } });
}

export async function updateProfile(userId: string, data: { name: string; login: string }): Promise<void> {
  await db.user.update({ where: { id: userId }, data });
}

/** Sets the password and signs out every other device (new session version). */
export async function setPassword(userId: string, passwordHash: string): Promise<number> {
  const user = await db.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return user.sessionVersion;
}

/**
 * New account from an admin invitation: its own household first (Repas, Courses), then
 * the user, in one transaction.
 */
export async function createUser(data: { name: string; login: string; passwordHash: string }): Promise<{ id: string; sessionVersion: number }> {
  return db.$transaction(async (tx) => {
    const household = await tx.household.create({ data: {}, select: { id: true } });
    const user = await tx.user.create({
      data: { ...data, role: "MEMBER", householdId: household.id, lastLoginAt: new Date() },
      select: { id: true, sessionVersion: true },
    });
    await tx.household.update({ where: { id: household.id }, data: { soloOwnerId: user.id } });
    return user;
  });
}

/* ---------- Admin ---------- */

export type MemberRow = {
  id: string;
  name: string;
  login: string;
  role: "ADMIN" | "MEMBER";
  active: boolean;
  disabledModules: string[];
  lastLoginAt: Date | null;
  createdAt: Date;
  hasPassword: boolean;
};

/** What the admin sees: accounts only (never households nor data). */
export async function listMembers(): Promise<MemberRow[]> {
  const rows = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, login: true, role: true, active: true, disabledModules: true, lastLoginAt: true, createdAt: true, passwordHash: true },
  });
  return rows.map(({ passwordHash, ...row }) => ({ ...row, hasPassword: passwordHash !== null }));
}

export function findMember(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, active: true } });
}

/** Deactivating signs the person out everywhere. */
export async function setActive(userId: string, active: boolean): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { active, ...(active ? {} : { sessionVersion: { increment: 1 } }) } });
}

export async function setDisabledModules(userId: string, disabledModules: string[]): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { disabledModules } });
}
