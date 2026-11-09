import Link from "next/link";
import { Button, Card, ErrorText, inputClass, PageTitle } from "@/components/ui";
import { getActiveGroup, listGroupsForUser } from "@/lib/groups";
import { requireUser } from "@/lib/session";
import { createGroupAction, selectGroupAction } from "./actions";

export const metadata = { title: "Grupper" };

export default async function GroupsPage({ searchParams }: PageProps<"/grupper">) {
  const user = await requireUser("/grupper");
  const sp = await searchParams;
  const [groups, active] = await Promise.all([listGroupsForUser(user.id), getActiveGroup(user.id)]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle sub="Kamper, spillere og statistikk hører til en gruppe">Grupper</PageTitle>
      <ErrorText>{typeof sp.feil === "string" ? sp.feil : undefined}</ErrorText>

      {groups.length === 0 && (
        <Card>
          <p className="text-muted">
            Du er ikke med i noen gruppe ennå. Lag en gruppe under, eller åpne en invitasjonslenke du har fått.
          </p>
        </Card>
      )}

      {groups.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/grupper/${g.id}`} className="min-w-0 flex-1 hover:text-accent">
                <div className="truncate font-semibold">{g.name}</div>
                <div className="text-xs text-muted">
                  {g.members} {g.members === 1 ? "medlem" : "medlemmer"}
                  {g.role === "admin" && " · admin"}
                </div>
              </Link>
              {active?.id === g.id ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">Aktiv</span>
              ) : (
                <form action={selectGroupAction}>
                  <input type="hidden" name="groupId" value={g.id} />
                  <Button type="submit" size="sm" variant="secondary">Bytt til</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Lag en ny gruppe</h2>
        <form action={createGroupAction} className="flex gap-2">
          <input name="name" required maxLength={40} placeholder="F.eks. Fredagsdart" className={inputClass} />
          <Button type="submit" className="shrink-0">Lag gruppe</Button>
        </form>
        <p className="mt-2 text-xs text-muted">Du blir admin og får en invitasjonslenke du kan sende til vennene dine.</p>
      </Card>
    </div>
  );
}
