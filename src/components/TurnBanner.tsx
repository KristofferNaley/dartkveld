import { formatDart } from "@/games/core/engine";
import type { BaseGameState, LoggedDart } from "@/games/core/types";
import { teamColor } from "@/lib/colors";
import { playerName, type MatchDTO } from "@/lib/match-types";

export function currentTurnDarts(state: BaseGameState): LoggedDart[] {
  const { round, teamIndex } = state.turn;
  return state.log.filter((d) => d.round === round && d.teamIndex === teamIndex);
}

export function lastCompletedTurn(state: BaseGameState): LoggedDart[] {
  const current = currentTurnDarts(state);
  const before = state.log.slice(0, state.log.length - current.length);
  const last = before.at(-1);
  if (!last) return [];
  return before.filter((d) => d.round === last.round && d.teamIndex === last.teamIndex);
}

/** Hvem kaster nå, og pilene så langt i runden. size="tv" gir storskjermversjon. */
export function TurnBanner({ match, state, size = "compact" }: { match: MatchDTO; state: BaseGameState; size?: "compact" | "tv" }) {
  const tv = size === "tv";
  if (state.finished && state.winnerTeamIndex !== null) {
    const w = state.winnerTeamIndex;
    return (
      <div className={`rounded-2xl text-center ${tv ? "py-[1.5vh]" : "border border-line bg-panel p-4"}`} style={{ background: `${teamColor(w)}22` }}>
        <div className={tv ? "text-[clamp(1.5rem,7vh,8rem)] font-black" : "text-2xl font-black"} style={{ color: teamColor(w) }}>
          🏆 {match.teams[w].name} vant!
        </div>
      </div>
    );
  }
  const { teamIndex, playerId, round } = state.turn;
  const darts = currentTurnDarts(state);
  const color = teamColor(teamIndex);
  const previous = lastCompletedTurn(state);
  const player = playerName(match, playerId);
  const showPlayer = player !== match.teams[teamIndex].name;
  const slots = [0, 1, 2].map((i) => darts[i]);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl ${tv ? "px-[2vw] py-[1.2vh]" : "border p-3"}`}
      style={{ borderColor: color, background: `${color}1a` }}
    >
      <div className="min-w-0 flex-1">
        <div className={tv ? "text-[clamp(0.9rem,2.6vh,3rem)] text-white/70" : "text-xs text-muted"}>Runde {round + 1} · kaster nå</div>
        <div className={`truncate font-black leading-tight ${tv ? "text-[clamp(1.2rem,5.5vh,6rem)]" : "text-xl"}`}>
          <span style={{ color }}>{match.teams[teamIndex].name}</span>
          {showPlayer && <span className="text-white"> · {player}</span>}
        </div>
        {!tv && previous.length > 0 && (
          <div className="mt-0.5 truncate text-xs text-muted">
            Forrige: {match.teams[previous[0].teamIndex].name} {previous.map((d) => formatDart(d)).join(", ")}
          </div>
        )}
      </div>
      <div className="flex gap-1.5">
        {slots.map((d, i) => (
          <div
            key={i}
            className={`tabular flex items-center justify-center rounded-lg border font-bold ${
              tv ? "h-[8vh] min-w-[9vh] px-[1vh] text-[clamp(1rem,4vh,4.5rem)]" : "h-11 min-w-11 px-1.5 text-sm"
            } ${d ? "border-white/30 bg-white/10" : i === darts.length ? "border-dashed" : "border-white/10 text-white/30"}`}
            style={!d && i === darts.length ? { borderColor: color } : undefined}
          >
            {d ? formatDart(d) : "–"}
          </div>
        ))}
      </div>
    </div>
  );
}
