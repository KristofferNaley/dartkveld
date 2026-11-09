import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { group, groupInvite, groupMember, match, user } from "@/db/schema";
import { isInviteCodeShape, newInviteCode } from "./codes";

export const GROUP_COOKIE = "dart_gruppe";

export class GroupError extends Error {}

export interface GroupSummary {
  id: string;
  name: string;
  role: "admin" | "member";
  members: number;
}

/** Gruppene en bruker er med i, eldste medlemskap først. */
export const listGroupsForUser = cache(async (userId: string): Promise<GroupSummary[]> => {
  const rows = await db
    .select({
      id: group.id,
      name: group.name,
      role: groupMember.role,
      members: sql<number>`(select count(*)::int from ${groupMember} gm where gm.group_id = ${group.id})`,
    })
    .from(groupMember)
    .innerJoin(group, eq(group.id, groupMember.groupId))
    .where(eq(groupMember.userId, userId))
    .orderBy(asc(groupMember.joinedAt), asc(group.name));
  return rows;
});

export async function memberRole(groupId: string, userId: string): Promise<"admin" | "member" | null> {
  const [row] = await db
    .select({ role: groupMember.role })
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)));
  return row?.role ?? null;
}

export const isMember = cache(async (groupId: string, userId: string) => (await memberRole(groupId, userId)) !== null);

/** Den aktive gruppa: den brukeren valgte sist (cookie), ellers den første hen er med i. */
export const getActiveGroup = cache(async (userId: string): Promise<GroupSummary | null> => {
  const groups = await listGroupsForUser(userId);
  if (groups.length === 0) return null;
  const wanted = (await cookies()).get(GROUP_COOKIE)?.value;
  return groups.find((g) => g.id === wanted) ?? groups[0];
});

/** Krever at brukeren er med i minst én gruppe. Ellers sendes hen til gruppesiden. */
export async function requireGroup(userId: string): Promise<GroupSummary> {
  const g = await getActiveGroup(userId);
  if (!g) redirect("/grupper");
  return g;
}

export async function setActiveGroup(userId: string, groupId: string) {
  if (!(await isMember(groupId, userId))) throw new GroupError("Du er ikke med i denne gruppa");
  (await cookies()).set(GROUP_COOKIE, groupId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

const nameSchema = (name: string) => {
  const n = name.trim();
  if (n.length === 0) throw new GroupError("Gruppa trenger et navn");
  if (n.length > 40) throw new GroupError("Navnet er for langt");
  return n;
};

export async function createGroup(userId: string, name: string): Promise<string> {
  const clean = nameSchema(name);
  return db.transaction(async (tx) => {
    const [g] = await tx.insert(group).values({ name: clean, createdBy: userId }).returning({ id: group.id });
    await tx.insert(groupMember).values({ groupId: g.id, userId, role: "admin" });
    await tx.insert(groupInvite).values({ groupId: g.id, code: newInviteCode(), createdBy: userId });
    return g.id;
  });
}

export async function getGroupDetails(groupId: string) {
  const [g] = await db.select({ id: group.id, name: group.name, createdAt: group.createdAt }).from(group).where(eq(group.id, groupId));
  if (!g) return null;
  const members = await db
    .select({ id: user.id, name: user.name, role: groupMember.role, joinedAt: groupMember.joinedAt })
    .from(groupMember)
    .innerJoin(user, eq(user.id, groupMember.userId))
    .where(eq(groupMember.groupId, groupId))
    .orderBy(asc(groupMember.joinedAt), asc(user.name));
  const [invite] = await db
    .select({ code: groupInvite.code })
    .from(groupInvite)
    .where(and(eq(groupInvite.groupId, groupId), isNull(groupInvite.revokedAt)))
    .orderBy(asc(groupInvite.createdAt))
    .limit(1);
  return { ...g, members, inviteCode: invite?.code ?? null };
}

/** Medlemmene i en gruppe, brukt til spillervalg og statistikk. */
export async function listGroupMembers(groupId: string) {
  return db
    .select({ id: user.id, name: user.name })
    .from(groupMember)
    .innerJoin(user, eq(user.id, groupMember.userId))
    .where(eq(groupMember.groupId, groupId))
    .orderBy(asc(user.name));
}

async function requireAdmin(groupId: string, userId: string) {
  if ((await memberRole(groupId, userId)) !== "admin") throw new GroupError("Bare gruppeadmin kan gjøre dette");
}

export async function renameGroup(userId: string, groupId: string, name: string) {
  await requireAdmin(groupId, userId);
  await db.update(group).set({ name: nameSchema(name) }).where(eq(group.id, groupId));
}

/** Trekker tilbake gjeldende lenke og lager en ny. */
export async function renewInvite(userId: string, groupId: string) {
  await requireAdmin(groupId, userId);
  await db.transaction(async (tx) => {
    await tx.update(groupInvite).set({ revokedAt: new Date() }).where(and(eq(groupInvite.groupId, groupId), isNull(groupInvite.revokedAt)));
    await tx.insert(groupInvite).values({ groupId, code: newInviteCode(), createdBy: userId });
  });
}

export async function revokeInvite(userId: string, groupId: string) {
  await requireAdmin(groupId, userId);
  await db.update(groupInvite).set({ revokedAt: new Date() }).where(and(eq(groupInvite.groupId, groupId), isNull(groupInvite.revokedAt)));
}

export async function findInvite(code: string) {
  if (!isInviteCodeShape(code)) return null;
  const [row] = await db
    .select({ groupId: group.id, groupName: group.name })
    .from(groupInvite)
    .innerJoin(group, eq(group.id, groupInvite.groupId))
    .where(and(eq(groupInvite.code, code), isNull(groupInvite.revokedAt)));
  return row ?? null;
}

/** Legger brukeren til i gruppa bak invitasjonen. Er hen allerede med, skjer ingenting. */
export async function joinByInvite(userId: string, code: string): Promise<string> {
  const invite = await findInvite(code);
  if (!invite) throw new GroupError("Invitasjonen er ugyldig eller trukket tilbake");
  await db.insert(groupMember).values({ groupId: invite.groupId, userId }).onConflictDoNothing();
  return invite.groupId;
}

export async function setMemberRole(adminId: string, groupId: string, targetId: string, role: "admin" | "member") {
  await requireAdmin(groupId, adminId);
  if (role === "member") await assertNotLastAdmin(groupId, targetId);
  await db.update(groupMember).set({ role }).where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, targetId)));
}

async function assertNotLastAdmin(groupId: string, userId: string) {
  const admins = await db
    .select({ userId: groupMember.userId })
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.role, "admin")));
  if (admins.length === 1 && admins[0].userId === userId) {
    throw new GroupError("Gruppa må ha minst én admin. Gjør noen andre til admin først.");
  }
}

export async function removeMember(adminId: string, groupId: string, targetId: string) {
  await requireAdmin(groupId, adminId);
  if (adminId === targetId) throw new GroupError("Bruk «Forlat gruppa» for å gå ut selv");
  await db.delete(groupMember).where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, targetId)));
}

/** Forlater gruppa. Siste admin må først gjøre noen andre til admin, med mindre hen er alene. */
export async function leaveGroup(userId: string, groupId: string) {
  const members = await db.select({ userId: groupMember.userId }).from(groupMember).where(eq(groupMember.groupId, groupId));
  if (members.length > 1) await assertNotLastAdmin(groupId, userId);
  await db.delete(groupMember).where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)));
  // En tom gruppe uten kamper trengs ikke lenger
  if (members.length === 1) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(match).where(eq(match.groupId, groupId));
    if (n === 0) await db.delete(group).where(eq(group.id, groupId));
  }
}
