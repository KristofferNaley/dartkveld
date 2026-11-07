"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

const schema = z.string().trim().min(1, "Navn mangler").max(40, "Navnet er for langt");

export async function updateName(_prev: { error?: string; ok?: boolean } | null, form: FormData) {
  await requireUser();
  const parsed = schema.safeParse(form.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await auth.api.updateUser({ body: { name: parsed.data }, headers: await headers() });
  revalidatePath("/", "layout");
  return { ok: true };
}
