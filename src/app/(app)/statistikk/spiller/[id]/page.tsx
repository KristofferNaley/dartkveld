import { notFound, redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { PlayerStatsView, StatsTabs } from "@/components/stats/StatsViews";
import { mickeyMouse } from "@/games/mickey-mouse/rules";
import { requireGroup } from "@/lib/groups";
import { requireUser } from "@/lib/session";
import { headToHead, playerStats } from "@/lib/stats/compute";
import { loadStatsData } from "@/lib/stats/queries";

export const metadata = { title: "Statistikk" };

export default async function PlayerStatsPage({ params }: PageProps<"/statistikk/spiller/[id]">) {
  const { id } = await params;
  const me = await requireUser(`/statistikk/spiller/${id}`);
  if (id === me.id) redirect("/statistikk");
  const group = await requireGroup(me.id);
  const data = await loadStatsData(mickeyMouse.type, group.id);
  const person = data.users.find((u) => u.id === id);
  if (!person) notFound();
  const stats = playerStats(person.id, data.darts, data.matches, mickeyMouse.targets);
  return (
    <div>
      <PageTitle sub={`${group.name} · ${mickeyMouse.name}`}>{person.name}</PageTitle>
      <StatsTabs active="spiller" />
      <PlayerStatsView stats={stats} h2h={headToHead(person.id, data.users, data.matches)} />
    </div>
  );
}
