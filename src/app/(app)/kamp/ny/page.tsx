import { PageTitle } from "@/components/ui";
import { listGroupMembers, requireGroup } from "@/lib/groups";
import { requireUser } from "@/lib/session";
import { NewMatchForm } from "./NewMatchForm";

export const metadata = { title: "Ny kamp" };

export default async function NewMatchPage() {
  const user = await requireUser("/kamp/ny");
  const group = await requireGroup(user.id);
  const users = await listGroupMembers(group.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle sub={`Velg spill, lag og spillere i ${group.name}`}>Ny kamp</PageTitle>
      <NewMatchForm users={users} me={{ id: user.id, name: user.name }} />
    </div>
  );
}
