import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { isAdminEmail } from "./admin-shared";
import { adminEmails, auth } from "./auth";

export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user;
  // Kontoer som er lagt til i ADMIN_EMAILS etter at de ble opprettet, får admin-rollen første gang de er innom
  if (u && u.role !== "admin" && isAdminEmail(u.email, adminEmails())) {
    await db.update(userTable).set({ role: "admin" }).where(eq(userTable.id, u.id));
    u.role = "admin";
  }
  return session;
});

export async function getUser() {
  return (await getSession())?.user ?? null;
}

export async function requireUser(returnTo?: string) {
  const user = await getUser();
  if (!user) redirect(returnTo ? `/logg-inn?neste=${encodeURIComponent(returnTo)}` : "/logg-inn");
  return user;
}

/** Bare for admin. Andre får en vanlig «finnes ikke»-side, så adminsidene ikke avsløres. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/logg-inn?neste=%2Fadmin");
  if (user.role !== "admin") notFound();
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;
