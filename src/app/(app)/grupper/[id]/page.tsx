import { notFound } from "next/navigation";
import { z } from "zod";
import { InviteLink } from "@/components/InviteLink";
import { Button, Card, ErrorText, inputClass, PageTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getGroupDetails, memberRole } from "@/lib/groups";
import { requireUser } from "@/lib/session";
import { appUrl } from "@/lib/url";
import { leaveGroupAction, memberAction, renameGroupAction, renewInviteAction, revokeInviteAction } from "../actions";

export const metadata = { title: "Gruppe" };

export default async function GroupPage({ params, searchParams }: PageProps<"/grupper/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/grupper/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const role = await memberRole(id, user.id);
  if (!role) notFound();
  const group = (await getGroupDetails(id))!;
  const sp = await searchParams;
  const isAdmin = role === "admin";
  const link = group.inviteCode ? `${appUrl()}/bli-med/${group.inviteCode}` : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle sub={`Opprettet ${formatDate(group.createdAt)}`}>{group.name}</PageTitle>
      <ErrorText>{typeof sp.feil === "string" ? sp.feil : undefined}</ErrorText>

      <Card>
        <h2 className="mb-1 font-semibold">Inviter venner</h2>
        <p className="mb-3 text-sm text-muted">Alle med lenken kan lage konto og bli med i gruppa.</p>
        {link ? (
          <InviteLink url={link} groupName={group.name} />
        ) : (
          <p className="text-sm text-muted">Ingen aktiv invitasjonslenke.</p>
        )}
        {isAdmin && (
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={renewInviteAction}>
              <input type="hidden" name="groupId" value={id} />
              <Button type="submit" size="sm" variant="secondary">{link ? "Lag ny lenke" : "Lag lenke"}</Button>
            </form>
            {link && (
              <form action={revokeInviteAction}>
                <input type="hidden" name="groupId" value={id} />
                <Button type="submit" size="sm" variant="ghost">Trekk tilbake</Button>
              </form>
            )}
          </div>
        )}
        {isAdmin && link && <p className="mt-2 text-xs text-muted">En ny lenke gjør den gamle ugyldig.</p>}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Medlemmer ({group.members.length})</h2>
        <ul className="divide-y divide-line">
          {group.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{m.name}</span>
                {m.id === user.id && <span className="text-muted"> (deg)</span>}
                {m.role === "admin" && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">admin</span>}
              </div>
              {isAdmin && m.id !== user.id && (
                <div className="flex gap-1.5">
                  {[
                    [m.role === "admin" ? "demote" : "promote", m.role === "admin" ? "Fjern admin" : "Gjør til admin"],
                    ["remove", "Fjern"],
                  ].map(([op, label]) => (
                    <form key={op} action={memberAction}>
                      <input type="hidden" name="groupId" value={id} />
                      <input type="hidden" name="userId" value={m.id} />
                      <input type="hidden" name="op" value={op} />
                      <Button type="submit" size="sm" variant={op === "remove" ? "danger" : "ghost"}>{label}</Button>
                    </form>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {isAdmin && (
        <Card>
          <h2 className="mb-3 font-semibold">Gruppenavn</h2>
          <form action={renameGroupAction} className="flex gap-2">
            <input type="hidden" name="groupId" value={id} />
            <input name="name" defaultValue={group.name} required maxLength={40} className={inputClass} aria-label="Gruppenavn" />
            <Button type="submit" variant="secondary" className="shrink-0">Lagre</Button>
          </form>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Kampene dine blir værende i gruppa hvis du forlater den.</p>
        <form action={leaveGroupAction}>
          <input type="hidden" name="groupId" value={id} />
          <Button type="submit" variant="danger" size="sm">Forlat gruppa</Button>
        </form>
      </Card>
    </div>
  );
}
