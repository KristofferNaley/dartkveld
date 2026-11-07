import { notFound } from "next/navigation";
import { z } from "zod";
import { getGame } from "@/games";
import { canScore, getMatch } from "@/lib/matches";
import { requireUser } from "@/lib/session";
import { appUrl } from "@/lib/url";
import { MatchScreen } from "./MatchScreen";

export const metadata = { title: "Kamp" };

export default async function MatchPage({ params }: PageProps<"/kamp/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/kamp/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const match = await getMatch(id);
  if (!match) notFound();
  getGame(match.gameType);
  return (
    <MatchScreen
      key={match.id} initial={match}
      canScore={canScore(match, user.id)} isOwner={match.ownerId === user.id}
      appUrl={appUrl()}
    />
  );
}
