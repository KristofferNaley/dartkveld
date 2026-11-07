import { fieldName } from "@/games/core/engine";
import { closedCount, fieldStatusFor, isShut, type MickeyState } from "@/games/mickey-mouse/rules";
import { teamColor } from "@/lib/colors";
import { playerName, type MatchDTO } from "@/lib/match-types";
import { Marks } from "../Marks";

/** Bakgrunn for en rute: lukket = lagets farge, stengt = mørk. */
function cellBackground(status: "aapen" | "lukket" | "stengt", color: string, current: boolean) {
  if (status === "stengt") return "rgba(0,0,0,0.45)";
  if (status === "lukket") return `${color}40`;
  return current ? `${color}10` : undefined;
}

/** Kompakt tavle for poengføring og delingssiden. */
export function MickeyBoard({ match, state, highlightTurn = true }: { match: MatchDTO; state: MickeyState; highlightTurn?: boolean }) {
  const current = highlightTurn && !state.finished ? state.turn.teamIndex : -1;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className="border-b border-line">
            <th className="w-20 px-2 py-2 text-left text-xs font-medium text-muted">Lukket</th>
            {match.teams.map((t, i) => (
              <th
                key={t.id}
                className={`px-1 py-2 align-bottom ${i === current ? "bg-white/[0.06]" : ""}`}
                style={i === current ? { boxShadow: `inset 0 3px 0 ${teamColor(i)}` } : undefined}
              >
                <div className="truncate text-sm font-semibold" style={{ color: teamColor(i) }}>
                  {t.name}
                  {state.winnerTeamIndex === i && " 🏆"}
                </div>
                {i === current && <div className="truncate text-xs text-muted">{playerName(match, state.turn.playerId)}</div>}
                <div className="tabular text-2xl font-bold">
                  {closedCount(state.teams[i])}
                  <span className="text-sm font-medium text-muted">/{state.targets.length}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.targets.map((f) => {
            const shut = isShut(state, f);
            return (
              <tr key={f} className="border-b border-line/60 last:border-0">
                <td className={`px-2 py-1.5 text-left font-bold tabular ${shut ? "text-muted line-through" : ""}`}>{fieldName(f)}</td>
                {match.teams.map((t, i) => {
                  const status = fieldStatusFor(state, i, f);
                  return (
                    <td key={t.id} className="px-1 py-1.5 text-lg" style={{ background: cellBackground(status, teamColor(i), i === current) }}>
                      <Marks count={state.teams[i].marks[f]} muted={shut} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <Legend />
    </div>
  );
}

export function Legend({ big = false }: { big?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-center px-3 py-2 text-muted ${big ? "gap-[3vw] text-[2.2vh]" : "gap-4 text-xs"}`}>
      <span>🎯 = ett treff, tre treff lukker feltet</span>
      <span className="flex items-center gap-1.5">
        <span className={`rounded bg-white/30 ${big ? "h-[2.4vh] w-[2.4vh]" : "h-3 w-3"}`} /> Lukket
      </span>
      <span>
        <span className="line-through">20</span> Stengt (alle har lukket)
      </span>
    </div>
  );
}

/** Storskjermtavle: fyller hele skjermen, stor tekst og høy kontrast. */
export function MickeyTvBoard({ match, state }: { match: MatchDTO; state: MickeyState }) {
  const current = state.finished ? -1 : state.turn.teamIndex;
  const n = match.teams.length;
  const rows = state.targets.length;
  return (
    <div
      className="grid h-full min-h-0 w-full"
      style={{ gridTemplateColumns: `minmax(10vw, auto) repeat(${n}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))` }}
    >
      <div />
      {match.teams.map((t, i) => (
        <div
          key={t.id}
          className="mx-[0.4vw] flex min-w-0 flex-col items-center justify-end rounded-t-[1.5vh] px-[0.5vw] pb-[1vh] pt-[1.2vh]"
          style={i === current ? { background: `${teamColor(i)}26`, boxShadow: `inset 0 0.7vh 0 ${teamColor(i)}` } : undefined}
        >
          <div className="max-w-full truncate text-[clamp(1rem,3.6vh,4rem)] font-bold leading-tight" style={{ color: teamColor(i) }}>
            {t.name}
            {state.winnerTeamIndex === i && " 🏆"}
          </div>
          <div className="tabular text-[clamp(2rem,9vh,11rem)] font-black leading-none">
            {closedCount(state.teams[i])}
            <span className="text-[0.4em] font-bold text-white/50">/{rows}</span>
          </div>
        </div>
      ))}
      {state.targets.map((f) => {
        const shut = isShut(state, f);
        return [
          <div
            key={`l${f}`}
            className={`flex items-center justify-end border-t border-white/10 pr-[1.5vw] font-black tabular leading-none ${
              f > 25 ? "text-[clamp(1rem,4.5vh,5rem)]" : "text-[clamp(1rem,6vh,7rem)]"
            } ${shut ? "text-white/25 line-through decoration-[0.6vh]" : "text-white"}`}
          >
            {fieldName(f)}
          </div>,
          ...match.teams.map((t, i) => (
            <div
              key={`${f}-${t.id}`}
              className="mx-[0.4vw] flex items-center justify-center border-t border-white/10 text-[clamp(1rem,min(5.2vh,3.2vw),5.5rem)]"
              style={{ background: cellBackground(fieldStatusFor(state, i, f), teamColor(i), i === current) }}
            >
              <Marks count={state.teams[i].marks[f]} muted={shut} />
            </div>
          )),
        ];
      })}
    </div>
  );
}
