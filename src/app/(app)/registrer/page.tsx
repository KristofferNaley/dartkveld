import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Card, LinkButton } from "@/components/ui";
import { hasUsers } from "@/lib/auth";
import { findInvite } from "@/lib/groups";

export const metadata = { title: "Lag konto" };

export default async function RegisterPage({ searchParams }: PageProps<"/registrer">) {
  const sp = await searchParams;
  const kode = typeof sp.kode === "string" ? sp.kode : "";
  const invite = kode ? await findInvite(kode) : null;
  const open = !(await hasUsers());

  if (!invite && !open) {
    return (
      <Card className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Lag konto</h1>
        <p className="text-muted">
          Du trenger en invitasjonslenke for å lage konto. Be noen i gruppa om å sende deg lenken.
          {kode && " Lenken du brukte er ugyldig eller trukket tilbake."}
        </p>
        <LinkButton href="/logg-inn" variant="secondary" className="w-full">
          Jeg har allerede konto
        </LinkButton>
      </Card>
    );
  }

  return (
    <Suspense>
      <AuthForm mode="register" inviteCode={invite ? kode : undefined} groupName={invite?.groupName} />
    </Suspense>
  );
}
