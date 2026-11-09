"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createGroup,
  GroupError,
  leaveGroup,
  removeMember,
  renameGroup,
  renewInvite,
  revokeInvite,
  setActiveGroup,
  setMemberRole,
} from "@/lib/groups";
import { requireUser } from "@/lib/session";

const id = z.uuid();
const text = (form: FormData, key: string) => String(form.get(key) ?? "");

/** Kjør en gruppehandling. En GroupError vises som melding på siden i stedet for en feilside. */
async function run(back: string, fn: (userId: string) => Promise<string | void>) {
  const user = await requireUser(back);
  let to: string | void;
  try {
    to = await fn(user.id);
  } catch (err) {
    if (err instanceof GroupError) redirect(`${back}?feil=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/", "layout");
  redirect(to || back);
}

export async function createGroupAction(form: FormData) {
  await run("/grupper", async (userId) => {
    const groupId = await createGroup(userId, text(form, "name"));
    await setActiveGroup(userId, groupId);
    return `/grupper/${groupId}`;
  });
}

/** Bytter aktiv gruppe fra menyen. Blir værende på samme side. */
export async function selectGroupAction(form: FormData) {
  const user = await requireUser();
  const groupId = text(form, "groupId");
  if (!id.safeParse(groupId).success) return;
  try {
    await setActiveGroup(user.id, groupId);
  } catch (err) {
    if (!(err instanceof GroupError)) throw err;
  }
  revalidatePath("/", "layout");
}

function groupPath(form: FormData) {
  const groupId = text(form, "groupId");
  if (!id.safeParse(groupId).success) redirect("/grupper");
  return groupId;
}

export async function renameGroupAction(form: FormData) {
  const groupId = groupPath(form);
  await run(`/grupper/${groupId}`, (userId) => renameGroup(userId, groupId, text(form, "name")));
}

export async function renewInviteAction(form: FormData) {
  const groupId = groupPath(form);
  await run(`/grupper/${groupId}`, (userId) => renewInvite(userId, groupId));
}

export async function revokeInviteAction(form: FormData) {
  const groupId = groupPath(form);
  await run(`/grupper/${groupId}`, (userId) => revokeInvite(userId, groupId));
}

export async function memberAction(form: FormData) {
  const groupId = groupPath(form);
  const target = text(form, "userId");
  const op = text(form, "op");
  await run(`/grupper/${groupId}`, async (userId) => {
    if (op === "remove") await removeMember(userId, groupId, target);
    else if (op === "promote") await setMemberRole(userId, groupId, target, "admin");
    else if (op === "demote") await setMemberRole(userId, groupId, target, "member");
  });
}

export async function leaveGroupAction(form: FormData) {
  const groupId = groupPath(form);
  await run(`/grupper/${groupId}`, async (userId) => {
    await leaveGroup(userId, groupId);
    return "/grupper";
  });
}
