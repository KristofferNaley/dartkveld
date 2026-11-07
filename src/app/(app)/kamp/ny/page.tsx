import { PageTitle } from "@/components/ui";
import { listUsers } from "@/lib/matches";
import { requireUser } from "@/lib/session";
import { NewMatchForm } from "./NewMatchForm";

export const metadata = { title: "Ny kamp" };

export default async function NewMatchPage() {
  const user = await requireUser("/kamp/ny");
  const users = await listUsers();
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle sub="Velg spill, lag og spillere">Ny kamp</PageTitle>
      <NewMatchForm users={users} me={{ id: user.id, name: user.name }} />
    </div>
  );
}
