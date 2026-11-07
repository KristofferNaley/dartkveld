import { MatchList, StatCards } from "@/components/MatchList";
import { PageTitle } from "@/components/ui";
import { listMatchesForUser, statsForUser } from "@/lib/matches";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Historikk" };

export default async function HistoryPage() {
  const user = await requireUser("/historikk");
  const [matches, stats] = await Promise.all([listMatchesForUser(user.id, 200), statsForUser(user.id)]);
  return (
    <div className="space-y-6">
      <PageTitle sub="Kamper du har spilt eller opprettet">Historikk</PageTitle>
      <StatCards {...stats} />
      <MatchList matches={matches} empty="Du har ingen kamper ennå." />
    </div>
  );
}
