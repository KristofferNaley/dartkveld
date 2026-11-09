import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <nav className="mb-5 flex gap-2 text-sm" aria-label="Admin">
        <Link href="/admin" className="rounded-full bg-panel-2 px-3 py-1.5 font-medium hover:bg-line">Oversikt</Link>
        <Link href="/admin/brukere" className="rounded-full bg-panel-2 px-3 py-1.5 font-medium hover:bg-line">Brukere</Link>
      </nav>
      {children}
    </div>
  );
}
