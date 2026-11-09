import Link from "next/link";
import { PageTitle } from "@/components/ui";
import { fmtMpr, fmtPct, StatsTabs } from "@/components/stats/StatsViews";
import { BULL } from "@/games/core/types";
import { mickeyMouse } from "@/games/mickey-mouse/rules";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { gangTable, latestEvening, titles, type GangRow } from "@/lib/stats/compute";
import { loadStatsData } from "@/lib/stats/queries";

export const metadata = { title: "Gjengen" };

const SORTS = {
  mpr: { label: "Merker/runde", value: (r: GangRow) => r.mpr },
  treff: { label: "Treff %", value: (r: GangRow) => r.hitRate },
  kamper: { label: "Kamper", value: (r: GangRow) => r.matches },
  seire: { label: "Seire", value: (r: GangRow) => r.wins },
  andel: { label: "Seiers­andel", value: (r: GangRow) => r.winRate },
} as const;
type SortKey = keyof typeof SORTS;

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function GangPage({ searchParams }: PageProps<"/statistikk/gjengen">) {
  const me = await requireUser("/statistikk/gjengen");
  const sp = await searchParams;
  const sort: SortKey = typeof sp.sort === "string" && sp.sort in SORTS ? (sp.sort as SortKey) : "mpr";
  const data = await loadStatsData(mickeyMouse.type);
  const rows = [...gangTable(data.users, data.darts, data.matches)].sort((a, b) => SORTS[sort].value(b) - SORTS[sort].value(a));
  const evening = latestEvening(data.users, data.darts);
  const awards = titles(data.users, data.darts, data.matches, BULL);

  return (
    <div>
      <PageTitle sub={`${mickeyMouse.name} · bare innloggede spillere`}>Statistikk</PageTitle>
      <StatsTabs active="gjengen" />

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel p-6 text-center text-muted">Ingen kast registrert ennå.</p>
      ) : (
        <div className="space-y-4">
          {evening && evening.rows.length > 0 && (
            <section className="rounded-2xl border border-accent/40 bg-accent/10 p-4 sm:p-5">
              <h2 className="font-semibold">Kveldens beste</h2>
              <p className="text-sm text-muted">Siste spillekveld, {formatDate(evening.evening)} · minst 9 piler</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                {evening.rows.slice(0, 3).map((r, i) => (
                  <li key={r.user.id} className="flex items-center gap-3 rounded-xl bg-bg/60 px-3 py-2">
                    <span className="text-2xl">{MEDALS[i]}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.user.name}</span>
                    <span className="tabular font-bold">{fmtMpr(r.mpr)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {awards.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Titler</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {awards.map((a) => (
                  <div key={a.key} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
                    <span className="text-4xl">{a.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-muted">{a.title}</div>
                      <div className="truncate text-lg font-bold">{a.user.name}</div>
                      <div className="text-xs text-muted">
                        {a.value} · {a.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="overflow-x-auto rounded-2xl border border-line bg-panel">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Spiller</th>
                  {(Object.keys(SORTS) as SortKey[]).map((k) => (
                    <th key={k} className="px-3 py-2.5 text-right font-medium">
                      <Link
                        href={k === "mpr" ? "/statistikk/gjengen" : `/statistikk/gjengen?sort=${k}`}
                        className={k === sort ? "font-semibold text-accent" : "hover:text-white"}
                        aria-current={k === sort ? "true" : undefined}
                      >
                        {SORTS[k].label}
                        {k === sort && " ↓"}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user.id} className={`border-b border-line/60 last:border-0 ${r.user.id === me.id ? "bg-accent/10" : ""}`}>
                    <td className="px-3 py-2.5 text-muted tabular">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link href={r.user.id === me.id ? "/statistikk" : `/statistikk/spiller/${r.user.id}`} className="hover:text-accent">
                        {r.user.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular">{r.darts ? fmtMpr(r.mpr) : "–"}</td>
                    <td className="px-3 py-2.5 text-right tabular">{r.darts ? fmtPct(r.hitRate) : "–"}</td>
                    <td className="px-3 py-2.5 text-right tabular">{r.matches}</td>
                    <td className="px-3 py-2.5 text-right tabular">{r.wins}</td>
                    <td className="px-3 py-2.5 text-right tabular">{r.matches ? fmtPct(r.winRate) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="text-xs text-muted">
            Merker per runde = snitt merker per tre piler (en trippel gir 3, en dobbel 2, Bullseye 2). Treff % er piler som ga minst ett merke. Gjester er ikke med.
          </p>
        </div>
      )}
    </div>
  );
}
