"use server";
import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { makeTempPassword } from "@/lib/admin-shared";
import { ownedMatchCount } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

const id = z.string().min(1).max(64);
type Result = { ok: true; password?: string } | { ok: false; error: string };

async function guarded(userId: string, fn: (adminId: string) => Promise<Result | void>): Promise<Result> {
  const admin = await requireAdmin();
  if (!id.safeParse(userId).success) return { ok: false, error: "Ugyldig bruker" };
  try {
    const res = await fn(admin.id);
    revalidatePath("/admin", "layout");
    return res ?? { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error && err.message ? err.message : "Noe gikk galt" };
  }
}

/** Setter et midlertidig passord og returnerer det én gang, så admin kan gi det videre. Alle innloggede økter avsluttes. */
export async function tempPasswordAction(userId: string): Promise<Result> {
  return guarded(userId, async () => {
    const password = makeTempPassword(randomInt);
    const h = await headers();
    await auth.api.setUserPassword({ body: { userId, newPassword: password }, headers: h });
    await auth.api.revokeUserSessions({ body: { userId }, headers: h });
    return { ok: true, password };
  });
}

export async function banAction(userId: string, ban: boolean): Promise<Result> {
  return guarded(userId, async (adminId) => {
    if (adminId === userId) return { ok: false, error: "Du kan ikke sperre deg selv" };
    const h = await headers();
    if (ban) await auth.api.banUser({ body: { userId, banReason: "Sperret av admin" }, headers: h });
    else await auth.api.unbanUser({ body: { userId }, headers: h });
  });
}

export async function deleteUserAction(userId: string): Promise<Result> {
  return guarded(userId, async (adminId) => {
    if (adminId === userId) return { ok: false, error: "Du kan ikke slette deg selv" };
    await auth.api.removeUser({ body: { userId }, headers: await headers() });
  });
}

export async function matchCountAction(userId: string): Promise<number> {
  await requireAdmin();
  return id.safeParse(userId).success ? ownedMatchCount(userId) : 0;
}
