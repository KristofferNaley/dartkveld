import { redirect } from "next/navigation";
import { Card, LinkButton, Button } from "@/components/ui";
import { findInvite, isMember } from "@/lib/groups";
import { getUser } from "@/lib/session";
import { joinAction } from "./actions";

export const metadata = { title: "Bli med i gruppe" };

export default async function JoinPage({ params }: PageProps<"/bli-med/[kode]">) {
  const { kode } = await params;
  const invite = await findInvite(kode);
  if (!invite) {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-bold">Ugyldig invitasjon</h1>
        <p className="text-muted">Lenken er ugyldig eller trukket tilbake. Be om en ny lenke.</p>
        <LinkButton href="/" variant="secondary" className="w-full">Til forsiden</LinkButton>
      </Card>
    );
  }
  const user = await getUser();
  if (user && (await isMember(invite.groupId, user.id))) redirect(`/grupper/${invite.groupId}`);

  return (
    <Card className="mx-auto max-w-md space-y-4 text-center">
      <p className="text-muted">Du er invitert til gruppa</p>
      <h1 className="text-3xl font-black">{invite.groupName}</h1>
      {user ? (
        <form action={joinAction.bind(null, kode)}>
          <Button type="submit" size="lg" className="w-full">Bli med</Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <LinkButton href={`/registrer?kode=${encodeURIComponent(kode)}`} size="lg">Lag konto og bli med</LinkButton>
          <LinkButton href={`/logg-inn?neste=${encodeURIComponent(`/bli-med/${kode}`)}`} variant="secondary">Jeg har konto</LinkButton>
        </div>
      )}
    </Card>
  );
}
