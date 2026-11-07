import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser("/profil");
  return (
    <div className="mx-auto max-w-md">
      <PageTitle sub={user.email}>Profil</PageTitle>
      <Card>
        <ProfileForm name={user.name} />
      </Card>
    </div>
  );
}
