import Link from "next/link";
import { getGame } from "@/games";
import { teamColor } from "@/lib/colors";
import { formatDateTime } from "@/lib/format";
import type { listMatchesForUser } from "@/lib/matches";

type Item = Awaited<ReturnType<typeof listMatchesForUser>>[number];

export function MatchList({ matches, empty }: { matches: Item[]; empty: string }) {
  if (matches.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {matches.map((m) => {
        const winner = m.teams.find((t) => t.id === m.winnerTeamId);
        const iWon = winner?.mine;
        return (
          <li key={m.id}>
            <Link href={`/kamp/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-panel-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-x-2 text-sm text-muted">
                  <span className="tabular font-semibold text-white">#{m.number}</span>
                  <span>{getGame(m.gameType).name}</span>
                  <span>·</span>
                  <span>{formatDateTime(m.createdAt)}</span>
                  <span>·</span>
                  <span>opprettet av {m.ownerName}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-medium">
                  {m.teams.map((t, i) => (
                    <span key={t.id} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-muted">mot</span>}
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: teamColor(i) }} />
                      <span className={t.id === m.winnerTeamId ? "font-bold" : ""}>{t.players.join(" & ")}</span>
                    </span>
                  ))}
                </div>
              </div>
              {m.status === "active" ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">Pågår</span>
              ) : iWon ? (
                <span className="rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok">Seier</span>
              ) : winner ? (
                <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs text-muted">{winner.players.join(" & ")} vant</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StatCards({ played, won, winRate }: { played: number; won: number; winRate: number }) {
  const items = [
    { label: "Kamper", value: String(played) },
    { label: "Seire", value: String(won) },
    { label: "Seiersandel", value: played ? `${Math.round(winRate * 100)} %` : "–" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl border border-line bg-panel p-4 text-center">
          <div className="tabular text-3xl font-bold">{i.value}</div>
          <div className="mt-1 text-sm text-muted">{i.label}</div>
        </div>
      ))}
    </div>
  );
}
