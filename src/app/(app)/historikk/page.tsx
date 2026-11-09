import { MatchList, StatCards } from "@/components/MatchList";
import { PageTitle } from "@/components/ui";
import { requireGroup } from "@/lib/groups";
import { listMatchesForGroup, statsForUser } from "@/lib/matches";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Historikk" };

export default async function HistoryPage() {
  const user = await requireUser("/historikk");
  const group = await requireGroup(user.id);
  const [matches, stats] = await Promise.all([listMatchesForGroup(group.id, user.id, 200), statsForUser(user.id, group.id)]);
  return (
    <div className="space-y-6">
      <PageTitle sub={`Alle kamper i ${group.name}`}>Historikk</PageTitle>
      <StatCards {...stats} />
      <MatchList matches={matches} empty="Ingen kamper i gruppa ennå." />
    </div>
  );
}
