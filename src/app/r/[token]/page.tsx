import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { roundsSummary, formatDart } from "@/games/core/engine";
import { getGameUi } from "@/components/games/registry";
import { Logo } from "@/components/Logo";
import { teamColor } from "@/lib/colors";
import { playerName } from "@/lib/match-types";
import { getSharedResult } from "@/lib/result";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  const r = await getSharedResult(token);
  if (!r) return { title: "Resultat ikke funnet", robots: { index: false } };
  const title = `${r.winner.name} vant ${r.game.name}`;
  const description = `${r.summary} · ${r.date}`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "article", siteName: "Dartkveld" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedResultPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const r = await getSharedResult(token);
  if (!r) notFound();
  const { match, state, game, winnerIndex, scores, date } = r;
  const ui = getGameUi(match.gameType);
  const rounds = roundsSummary(state);
  const ranked = [...scores].sort((a, b) => (a.index === winnerIndex ? -1 : b.index === winnerIndex ? 1 : 0));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-12">
      <header className="flex items-center gap-2 text-muted">
        <Logo className="h-6 w-6" />
        <span className="font-semibold text-white">Dartkveld</span>
        <span className="ml-auto text-sm">{date}</span>
      </header>

      <section className="rounded-3xl border p-6 text-center" style={{ borderColor: teamColor(winnerIndex), background: `${teamColor(winnerIndex)}1a` }}>
        <div className="text-sm uppercase tracking-widest text-muted">{game.name} · vinner</div>
        <h1 className="mt-1 text-4xl font-black sm:text-5xl" style={{ color: teamColor(winnerIndex) }}>
          🏆 {r.winner.name}
        </h1>
        {r.winner.players.length > 1 && <p className="mt-1 text-muted">{r.winner.players.map((p) => p.name).join(", ")}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {ranked.map((s) => (
            <div key={s.index} className="min-w-28 rounded-2xl bg-bg/60 px-4 py-3">
              <div className="truncate text-sm font-semibold" style={{ color: teamColor(s.index) }}>{s.name}</div>
              <div className="tabular text-3xl font-black">{s.score}</div>
              <div className="text-xs text-muted">{r.scoreLabel}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Sluttstilling</h2>
        <ui.Board match={match} state={state} highlightTurn={false} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Runde for runde</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2 font-medium text-muted">#</th>
                {match.teams.map((t, i) => (
                  <th key={t.id} className="px-3 py-2 font-semibold" style={{ color: teamColor(i) }}>{t.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, ri) => (
                <tr key={ri} className="border-b border-line/60 last:border-0 align-top">
                  <td className="px-3 py-2 tabular text-muted">{ri + 1}</td>
                  {match.teams.map((t, ti) => {
                    const entry = round.find((e) => e.teamIndex === ti);
                    return (
                      <td key={t.id} className="px-3 py-2">
                        {entry ? (
                          <>
                            <div className="tabular">{entry.darts.map((d) => formatDart(d)).join(" · ")}</div>
                            <div className="text-xs text-muted">
                              {match.teams[ti].players.length > 1 && `${playerName(match, entry.playerId)} · `}
                              {entry.points > 0 ? <span className="text-ok">+{entry.points} poeng</span> : `${entry.marks} treff`}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted">–</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-sm text-muted">
        Ført med <Link href="/" className="text-accent underline">Dartkveld</Link>
      </p>
    </main>
  );
}
