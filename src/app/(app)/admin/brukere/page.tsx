import { PageTitle } from "@/components/ui";
import { listAdminUsers } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { UserActions } from "./UserActions";

export const metadata = { title: "Brukere" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const users = await listAdminUsers();
  return (
    <div>
      <PageTitle sub={`${users.length} brukere`}>Brukere</PageTitle>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold">{u.name}</span>
                {u.role === "admin" && <span className="rounded-full bg-accent/15 px-1.5 text-xs font-semibold text-accent">admin</span>}
                {u.banned && <span className="rounded-full bg-danger/15 px-1.5 text-xs font-semibold text-danger">sperret</span>}
                {u.id === me.id && <span className="text-xs text-muted">(deg)</span>}
                <span className="truncate text-sm text-muted">{u.email}</span>
              </div>
              <div className="text-xs text-muted">
                Registrert {formatDate(u.createdAt)} · sist aktiv {u.lastActive ? formatDate(u.lastActive) : "–"} · {u.matches} kamper · {u.groups} grupper
              </div>
            </div>
            <UserActions id={u.id} name={u.name} banned={u.banned} isSelf={u.id === me.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
