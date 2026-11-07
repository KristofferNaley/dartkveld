"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteMatch, MatchError, setSharing } from "@/lib/matches";
import { requireUser } from "@/lib/session";

const id = z.uuid();

export async function setSharingAction(matchId: string, enabled: boolean): Promise<{ token?: string | null; error?: string }> {
  const user = await requireUser();
  if (!id.safeParse(matchId).success) return { error: "Ugyldig kamp" };
  try {
    return { token: await setSharing(matchId, user.id, enabled) };
  } catch (err) {
    if (err instanceof MatchError) return { error: err.message };
    throw err;
  }
}

export async function deleteMatchAction(matchId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!id.safeParse(matchId).success) return { error: "Ugyldig kamp" };
  try {
    await deleteMatch(matchId, user.id);
  } catch (err) {
    if (err instanceof MatchError) return { error: err.message };
    throw err;
  }
  redirect("/");
}
