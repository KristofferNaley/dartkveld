import Link from "next/link";
import { PageTitle } from "@/components/ui";
import { PlayerStatsView, StatsTabs } from "@/components/stats/StatsViews";
import { mickeyMouse } from "@/games/mickey-mouse/rules";
import { requireGroup } from "@/lib/groups";
import { requireUser } from "@/lib/session";
import { headToHead, playerStats } from "@/lib/stats/compute";
import { loadStatsData } from "@/lib/stats/queries";

export const metadata = { title: "Statistikk" };

export default async function MyStatsPage({ searchParams }: PageProps<"/statistikk">) {
  const me = await requireUser("/statistikk");
  const group = await requireGroup(me.id);
  const sp = await searchParams;
  // Egen statistikk kan vises for bare den aktive gruppa eller for alle gruppene dine
  const all = sp.gruppe === "alle";
  const data = await loadStatsData(mickeyMouse.type, all ? null : group.id);
  const stats = playerStats(me.id, data.darts, data.matches, mickeyMouse.targets);
  const pill = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium ${active ? "bg-accent text-accent-ink" : "bg-panel-2 text-muted hover:text-white"}`;
  return (
    <div>
      <PageTitle sub={`${mickeyMouse.name} · bare kast fra innloggede spillere`}>Statistikk</PageTitle>
      <StatsTabs active="meg" />
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Utvalg">
        <Link href="/statistikk" className={pill(!all)}>{group.name}</Link>
        <Link href="/statistikk?gruppe=alle" className={pill(all)}>Alle gruppene mine</Link>
      </div>
      <PlayerStatsView stats={stats} h2h={headToHead(me.id, data.users, data.matches)} />
    </div>
  );
}
