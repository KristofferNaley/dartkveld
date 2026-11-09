"use server";
import { redirect } from "next/navigation";
import { requireGroup } from "@/lib/groups";
import { createMatch, MatchError } from "@/lib/matches";
import { requireUser } from "@/lib/session";
import { newMatchSchema } from "@/lib/validation";

export async function createMatchAction(input: unknown): Promise<{ error: string }> {
  const user = await requireUser();
  const parsed = newMatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ugyldig kamp" };
  let id: string;
  try {
    const group = await requireGroup(user.id);
    id = await createMatch(user.id, group.id, parsed.data);
  } catch (err) {
    if (err instanceof MatchError) return { error: err.message };
    throw err;
  }
  redirect(`/kamp/${id}`);
}
