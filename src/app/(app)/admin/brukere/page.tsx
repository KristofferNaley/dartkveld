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
          <li key={u.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-lg font-semibold">{u.name}</span>
              {u.role === "admin" && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">admin</span>}
              {u.banned && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">sperret</span>}
              {u.id === me.id && <span className="text-sm text-muted">(deg)</span>}
              <span className="text-sm text-muted">{u.email}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Registrert</dt><dd>{formatDate(u.createdAt)}</dd></div>
              <div><dt className="text-muted">Sist aktiv</dt><dd>{u.lastActive ? formatDate(u.lastActive) : "–"}</dd></div>
              <div><dt className="text-muted">Kamper</dt><dd className="tabular">{u.matches}</dd></div>
              <div><dt className="text-muted">Grupper</dt><dd className="tabular">{u.groups}</dd></div>
            </dl>
            <UserActions id={u.id} name={u.name} banned={u.banned} isSelf={u.id === me.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
