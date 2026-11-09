"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GroupError, joinByInvite, setActiveGroup } from "@/lib/groups";
import { requireUser } from "@/lib/session";

export async function joinAction(code: string) {
  const user = await requireUser(`/bli-med/${code}`);
  let groupId: string;
  try {
    groupId = await joinByInvite(user.id, code);
    await setActiveGroup(user.id, groupId);
  } catch (err) {
    if (err instanceof GroupError) redirect(`/bli-med/${code}`);
    throw err;
  }
  revalidatePath("/", "layout");
  redirect(`/grupper/${groupId}`);
}
