import Link from "next/link";
import { getActiveGroup, listGroupsForUser } from "@/lib/groups";
import { selectGroupAction } from "@/app/(app)/grupper/actions";
import { getUser } from "@/lib/session";
import { Logo } from "./Logo";

export async function Header() {
  const user = await getUser();
  const [groups, active] = user ? await Promise.all([listGroupsForUser(user.id), getActiveGroup(user.id)]) : [[], null];
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Logo />
          <span className="hidden sm:inline">Dartkveld</span>
        </Link>
        {user && (
          <nav className="ml-auto flex items-center gap-0.5 text-sm sm:gap-1">
            <Link href="/kamp/ny" className="rounded-lg px-2.5 py-2 font-semibold text-accent hover:bg-panel-2 sm:px-3">
              Ny kamp
            </Link>
            <Link href="/statistikk" className="rounded-lg px-2.5 py-2 text-muted hover:bg-panel-2 hover:text-white sm:px-3">
              Statistikk
            </Link>
            <Link href="/historikk" className="rounded-lg px-2.5 py-2 text-muted hover:bg-panel-2 hover:text-white sm:px-3">
              Historikk
            </Link>
            <Link href="/profil" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-muted hover:bg-panel-2 hover:text-white sm:px-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
              </svg>
              Profil
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="rounded-lg px-2.5 py-2 text-muted hover:bg-panel-2 hover:text-white sm:px-3">
                Admin
              </Link>
            )}
            <Link href="/hjelp" aria-label="Hjelp" title="Hjelp" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:bg-panel-2 hover:text-white">
              ?
            </Link>
          </nav>
        )}
      </div>
      {user && (
        <div className="mx-auto flex h-9 max-w-5xl items-center gap-2 px-4 text-sm">
          <span className="text-muted">Gruppe:</span>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1 font-semibold hover:bg-panel-2">
              {active?.name ?? "Ingen gruppe"}
              <span className="text-xs text-muted" aria-hidden>▾</span>
            </summary>
            <div className="absolute left-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
              {groups.map((g) => (
                <form key={g.id} action={selectGroupAction}>
                  <input type="hidden" name="groupId" value={g.id} />
                  <button type="submit" className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-panel-2">
                    <span className="truncate">{g.name}</span>
                    {g.id === active?.id && <span className="text-accent" aria-label="Aktiv">✓</span>}
                  </button>
                </form>
              ))}
              <Link href="/grupper" className="block border-t border-line px-3 py-2.5 text-accent hover:bg-panel-2">
                Administrer grupper
              </Link>
            </div>
          </details>
        </div>
      )}
    </header>
  );
}
