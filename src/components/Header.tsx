import Link from "next/link";
import { getUser } from "@/lib/session";
import { Logo } from "./Logo";

export async function Header() {
  const user = await getUser();
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
            <Link href="/profil" className="max-w-20 truncate rounded-lg px-2.5 py-2 text-muted hover:bg-panel-2 hover:text-white sm:max-w-28 sm:px-3">
              {user.name}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
