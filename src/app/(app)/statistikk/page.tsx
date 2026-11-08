import { PageTitle } from "@/components/ui";
import { PlayerStatsView, StatsTabs } from "@/components/stats/StatsViews";
import { mickeyMouse } from "@/games/mickey-mouse/rules";
import { requireUser } from "@/lib/session";
import { headToHead, playerStats } from "@/lib/stats/compute";
import { loadStatsData } from "@/lib/stats/queries";

export const metadata = { title: "Statistikk" };

export default async function MyStatsPage() {
  const me = await requireUser("/statistikk");
  const data = await loadStatsData(mickeyMouse.type);
  const stats = playerStats(me.id, data.darts, data.matches, mickeyMouse.targets);
  return (
    <div>
      <PageTitle sub={`${mickeyMouse.name} · bare kast fra innloggede spillere`}>Statistikk</PageTitle>
      <StatsTabs active="meg" />
      <PlayerStatsView stats={stats} h2h={headToHead(me.id, data.users, data.matches)} />
    </div>
  );
}
