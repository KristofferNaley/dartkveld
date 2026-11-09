import Link from "next/link";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { fmtMpr, fmtPct } from "@/components/stats/StatsViews";
import { fieldName } from "@/games/core/engine";
import { mickeyMouse } from "@/games/mickey-mouse/rules";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { playerStats } from "@/lib/stats/compute";
import { loadStatsData } from "@/lib/stats/queries";
import { NameForm, PasswordForm, SignOutButton } from "./ProfileForm";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser("/profil");
  const data = await loadStatsData(mickeyMouse.type);
  const s = playerStats(user.id, data.darts, data.matches, mickeyMouse.targets);
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const facts = [
    { label: "Kamper", value: String(s.matches) },
    { label: "Seire", value: String(s.wins) },
    { label: "Seiersandel", value: s.matches ? fmtPct(s.winRate) : "–" },
    { label: "Treff per runde", value: s.darts ? fmtMpr(s.mpr) : "–" },
    { label: "Piler kastet", value: String(s.darts) },
    { label: "Favorittfelt", value: s.favoriteField !== null ? fieldName(s.favoriteField) : "–" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle>Profil</PageTitle>

      <Card className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-black text-accent-ink">
          {initials || "?"}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold">{user.name}</div>
          <div className="truncate text-sm text-muted">{user.email}</div>
          <div className="text-xs text-muted">Medlem siden {formatDate(user.createdAt)}</div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">Kort oppsummert</h2>
          <span className="text-xs text-muted">{mickeyMouse.name}</span>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-bg p-3">
              <dd className="tabular text-xl font-bold">{f.value}</dd>
              <dt className="text-xs text-muted">{f.label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/statistikk" size="sm">
            Full statistikk
          </LinkButton>
          <LinkButton href="/historikk" size="sm" variant="secondary">
            Mine kamper
          </LinkButton>
          <LinkButton href="/hjelp" size="sm" variant="ghost">
            Hjelp
          </LinkButton>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Navn</h2>
          <NameForm name={user.name} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Passord</h2>
          <PasswordForm />
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Logget inn som {user.email}. <Link href="/kamp/ny" className="text-accent">Start en kamp</Link>
        </p>
        <SignOutButton />
      </Card>
    </div>
  );
}
