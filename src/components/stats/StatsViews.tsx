import Link from "next/link";
import { fieldName } from "@/games/core/engine";
import { teamColor } from "@/lib/colors";
import { formatDate } from "@/lib/format";
import type { FormPoint, HeadToHead, PlayerStats } from "@/lib/stats/compute";

const num2 = new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMpr = (x: number) => num2.format(x);
export const fmtPct = (x: number) => `${Math.round(x * 100)} %`;

export function StatsTabs({ active }: { active: "meg" | "gjengen" | "spiller" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${on ? "bg-accent text-accent-ink" : "text-muted hover:bg-panel-2 hover:text-white"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-6 flex gap-1 rounded-xl border border-line bg-panel p-1" aria-label="Statistikk">
      {tab("/statistikk", "Min statistikk", active === "meg")}
      {tab("/statistikk/gjengen", "Gjengen", active === "gjengen")}
    </nav>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-3 sm:p-4">
      <div className="tabular text-xl font-bold sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted sm:text-sm">{label}</div>
      {hint && <div className="mt-0.5 hidden text-xs text-muted/70 sm:block">{hint}</div>}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PlayerStatsView({ stats, h2h }: { stats: PlayerStats; h2h: HeadToHead[] }) {
  if (stats.darts === 0 && stats.matches === 0) {
    return (
      <p className="rounded-2xl border border-line bg-panel p-6 text-center text-muted">
        Ingen kast registrert ennå. Statistikken fylles ut når du spiller kamper som innlogget spiller.
      </p>
    );
  }
  const counts = stats.fields.map((f) => f.hits);
  const maxField = Math.max(1, ...counts);
  const minField = Math.min(...counts);
  // Marker alle felt som deler topp/bunn, men bare når feltene faktisk er ulike
  const spread = maxField > minField;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile label="Treff per runde" value={fmtMpr(stats.mpr)} hint="Snitt treff per tre piler" />
        <Tile label="Treffprosent" value={fmtPct(stats.hitRate)} hint={`${stats.hits} av ${stats.darts} piler`} />
        <Tile label="Seiersandel" value={stats.matches ? fmtPct(stats.winRate) : "–"} hint={`${stats.wins} seire av ${stats.matches} kamper`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Favorittfelt" sub="Hvor treffene havner">
          <ul className="space-y-1.5">
            {stats.fields.map((f) => {
              const fav = spread && f.hits === maxField;
              const weak = spread && f.hits === minField;
              return (
                <li key={f.field} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 font-semibold tabular">{fieldName(f.field)}</span>
                  <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-bg">
                    <span
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{ width: `${(f.hits / maxField) * 100}%`, background: fav ? "var(--color-accent)" : "#38bdf8" }}
                    />
                  </span>
                  <span className="w-8 text-right tabular">{f.hits}</span>
                  <span className="w-5 text-center" aria-hidden>
                    {fav ? "⭐" : weak ? "🥶" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">⭐ mest truffet · 🥶 minst truffet</p>
        </Section>

        <div className="space-y-4">
          <Section title="Runder">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Beste runde</dt>
                <dd className="text-lg font-bold">
                  {stats.bestTurn ? (
                    <Link href={`/kamp/${stats.bestTurn.matchId}`} className="hover:text-accent">
                      {"🎯".repeat(stats.bestTurn.hits) || "0 treff"}
                    </Link>
                  ) : (
                    "–"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Runder spilt</dt>
                <dd className="text-lg font-bold tabular">{stats.turns}</dd>
              </div>
              <div>
                <dt className="text-muted">Perfekte runder 🔥</dt>
                <dd className="text-lg font-bold tabular">{stats.perfectTurns}</dd>
              </div>
              <div>
                <dt className="text-muted">Tre bom 🙈</dt>
                <dd className="text-lg font-bold tabular">{stats.blankTurns}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Pil 1, 2 og 3" sub="Treffprosent per pil i runden">
            <div className="grid grid-cols-3 gap-3">
              {stats.byDartIndex.map((b) => (
                <div key={b.index} className="text-center">
                  <div className="relative mx-auto h-24 w-10 overflow-hidden rounded-md bg-bg">
                    <span className="absolute inset-x-0 bottom-0 rounded-md bg-ok" style={{ height: `${b.rate * 100}%` }} />
                  </div>
                  <div className="mt-1.5 font-bold tabular">{b.darts ? fmtPct(b.rate) : "–"}</div>
                  <div className="text-xs text-muted">Pil {b.index + 1}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <Section title="Form" sub={`Treff per runde i de ${stats.form.length} siste kampene`}>
        <FormChart points={stats.form} />
      </Section>

      <Section title="Innbyrdes oppgjør" sub="Seire og tap mot hver venn (når dere var på hvert sitt lag)">
        {h2h.length === 0 ? (
          <p className="text-sm text-muted">Ingen ferdige kamper mot andre registrerte spillere ennå.</p>
        ) : (
          <ul className="divide-y divide-line">
            {h2h.map((r) => {
              const total = r.wins + r.losses;
              return (
                <li key={r.opponent.id} className="flex items-center gap-3 py-2">
                  <Link href={`/statistikk/spiller/${r.opponent.id}`} className="w-28 shrink-0 truncate font-medium hover:text-accent">
                    {r.opponent.name}
                  </Link>
                  <span className="flex h-3 flex-1 overflow-hidden rounded-full bg-bg">
                    <span className="bg-ok" style={{ width: `${total ? (r.wins / total) * 100 : 0}%` }} />
                    <span className="bg-danger" style={{ width: `${total ? (r.losses / total) * 100 : 0}%` }} />
                  </span>
                  <span className="w-14 text-right text-sm tabular">
                    <span className="text-ok">{r.wins}</span>–<span className="text-danger">{r.losses}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** Enkel linjegraf over treff per runde (skala 0–3), med prikker for seier/tap/pågår. */
function FormChart({ points }: { points: FormPoint[] }) {
  if (points.length === 0) return <p className="text-sm text-muted">Ingen kamper ennå.</p>;
  const W = 600;
  const H = 180;
  const pad = { l: 40, r: 14, t: 14, b: 14 };
  const x = (i: number) => (points.length === 1 ? (pad.l + W - pad.r) / 2 : pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - Math.min(v, 3) / 3) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${x(i)},${y(p.mpr)}`).join(" ");
  const avg = points.reduce((a, p) => a + p.mpr, 0) / points.length;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Form over de siste kampene">
        {[0, 1, 2, 3].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#263247" strokeDasharray={v === 0 ? undefined : "4 4"} />
            <text x={pad.l - 10} y={y(v) + 6} textAnchor="end" fontSize="18" fill="#8a99b3">
              {v}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(avg)} y2={y(avg)} stroke="#f5b301" strokeOpacity="0.5" strokeWidth="1.5" />
        <polyline points={line} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.matchId}>
            <a href={`/kamp/${p.matchId}`}>
              <circle cx={x(i)} cy={y(p.mpr)} r="7" fill={p.won === null ? "#8a99b3" : p.won ? "#34d399" : "#f43f5e"} stroke="#0a0e15" strokeWidth="2">
                <title>{`${formatDate(p.date)}: ${fmtMpr(p.mpr)} treff per runde${p.won === null ? " (pågår)" : p.won ? " (seier)" : " (tap)"}`}</title>
              </circle>
            </a>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-ok" /> Seier</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" /> Tap</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" /> Pågår</span>
        <span><span className="inline-block h-0.5 w-4 align-middle" style={{ background: teamColor(0) }} /> Snitt {fmtMpr(avg)}</span>
      </div>
    </div>
  );
}
