import { notFound } from "next/navigation";
import { z } from "zod";
import { getMatch } from "@/lib/matches";
import { requireUser } from "@/lib/session";
import { TvScreen } from "./TvScreen";

export const metadata = { title: "Visningsmodus" };

export default async function TvPage({ params }: PageProps<"/kamp/[id]/vis">) {
  const { id } = await params;
  await requireUser(`/kamp/${id}/vis`);
  if (!z.uuid().safeParse(id).success) notFound();
  const match = await getMatch(id);
  if (!match) notFound();
  return <TvScreen initial={match} />;
}
