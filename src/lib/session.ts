import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function getUser() {
  return (await getSession())?.user ?? null;
}

export async function requireUser(returnTo?: string) {
  const user = await getUser();
  if (!user) redirect(returnTo ? `/logg-inn?neste=${encodeURIComponent(returnTo)}` : "/logg-inn");
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;
