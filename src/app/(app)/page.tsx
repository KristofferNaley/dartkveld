import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MatchList, StatCards } from "@/components/MatchList";
import { LinkButton } from "@/components/ui";
import { getActiveGroup } from "@/lib/groups";
import { listMatchesForGroup, statsForUser } from "@/lib/matches";
import { getUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <Logo className="mx-auto h-20 w-20" />
        <h1 className="mt-6 text-3xl font-bold">Dartkveld</h1>
        <p className="mt-2 text-muted">Poengføring for gjengen. Før poeng på mobilen og vis tavla på TV-en.</p>
        <div className="mt-8 flex flex-col gap-3">
          <LinkButton href="/logg-inn" size="lg">Logg inn</LinkButton>
          <LinkButton href="/registrer" size="lg" variant="secondary">Lag konto</LinkButton>
        </div>
      </div>
    );
  }

  const group = await getActiveGroup(user.id);
  if (!group) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Hei, {user.name}</h1>
        <p className="text-muted">Du er ikke med i noen gruppe ennå. Lag en, eller åpne en invitasjonslenke du har fått.</p>
        <LinkButton href="/grupper" size="lg" className="w-full">Lag en gruppe</LinkButton>
      </div>
    );
  }
  const [matches, stats] = await Promise.all([listMatchesForGroup(group.id, user.id, 10), statsForUser(user.id, group.id)]);
  const active = matches.filter((m) => m.status === "active");
  const finished = matches.filter((m) => m.status === "finished").slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Hei, {user.name}</h1>
          <p className="text-muted">Klar for en runde i {group.name}?</p>
        </div>
        <LinkButton href="/kamp/ny" size="lg">Ny kamp</LinkButton>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Pågående kamper</h2>
          <MatchList matches={active} empty="" />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Din statistikk</h2>
          <Link href="/statistikk" className="text-sm text-accent">Mer statistikk</Link>
        </div>
        <StatCards {...stats} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Siste kamper i {group.name}</h2>
          <Link href="/historikk" className="text-sm text-accent">Se alle</Link>
        </div>
        <MatchList matches={finished} empty="Ingen ferdige kamper ennå." />
      </section>
    </div>
  );
}
