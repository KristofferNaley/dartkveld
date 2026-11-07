import { closedCount, fieldStatusFor, isShut, MICKEY_TARGETS, type MickeyState } from "@/games/mickey-mouse/rules";
import { teamColor } from "@/lib/colors";
import { playerName, type MatchDTO } from "@/lib/match-types";
import { Marks } from "../Marks";

const fieldLabel = (f: number) => (f === 25 ? "Bull" : String(f));

/** Kompakt tavle for poengføring og delingssiden. */
export function MickeyBoard({ match, state, highlightTurn = true }: { match: MatchDTO; state: MickeyState; highlightTurn?: boolean }) {
  const current = highlightTurn && !state.finished ? state.turn.teamIndex : -1;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className="border-b border-line">
            <th className="w-16 px-2 py-2 text-left text-xs font-medium text-muted">Lukket</th>
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
                  <span className="text-sm font-medium text-muted">/{MICKEY_TARGETS.length}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MICKEY_TARGETS.map((f) => {
            const shut = isShut(state, f);
            return (
              <tr key={f} className={`border-b border-line/60 last:border-0 ${shut ? "bg-black/30" : ""}`}>
                <td className={`px-2 py-1 text-left font-bold tabular ${shut ? "text-muted line-through" : ""}`}>{fieldLabel(f)}</td>
                {match.teams.map((t, i) => {
                  const status = fieldStatusFor(state, i, f);
                  return (
                    <td
                      key={t.id}
                      className={`px-1 py-1 ${i === current ? "bg-white/[0.06]" : ""}`}
                      style={status === "lukket" ? { background: `${teamColor(i)}1f` } : undefined}
                    >
                      <Marks
                        count={state.teams[i].marks[f]}
                        color={shut ? "#566377" : teamColor(i)}
                        className="mx-auto h-7 w-7"
                      />
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
  const cls = big ? "gap-[3vw] text-[2.2vh]" : "gap-4 text-xs";
  return (
    <div className={`flex flex-wrap items-center justify-center px-3 py-2 text-muted ${cls}`}>
      <span className="flex items-center gap-1.5">
        <Marks count={1} color="#cbd5e1" className={big ? "h-[3vh] w-[3vh]" : "h-4 w-4"} /> Åpent felt
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`rounded bg-white/15 ${big ? "h-[2.4vh] w-[2.4vh]" : "h-3 w-3"}`} /> Lukket
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`line-through ${big ? "" : ""}`}>20</span> Stengt (alle har lukket)
      </span>
    </div>
  );
}

/** Storskjermtavle: fyller hele skjermen, stor tekst og høy kontrast. */
export function MickeyTvBoard({ match, state }: { match: MatchDTO; state: MickeyState }) {
  const current = state.finished ? -1 : state.turn.teamIndex;
  const n = match.teams.length;
  return (
    <div
      className="grid h-full min-h-0 w-full"
      style={{ gridTemplateColumns: `minmax(10vw, auto) repeat(${n}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${MICKEY_TARGETS.length}, minmax(0, 1fr))` }}
    >
      <div />
      {match.teams.map((t, i) => (
        <div
          key={t.id}
          className="mx-[0.4vw] flex min-w-0 flex-col items-center justify-end rounded-t-[1.5vh] px-[0.5vw] pb-[1vh] pt-[1.2vh]"
          style={
            i === current
              ? { background: `${teamColor(i)}26`, boxShadow: `inset 0 0.7vh 0 ${teamColor(i)}` }
              : undefined
          }
        >
          <div className="max-w-full truncate text-[clamp(1rem,3.6vh,4rem)] font-bold leading-tight" style={{ color: teamColor(i) }}>
            {t.name}
            {state.winnerTeamIndex === i && " 🏆"}
          </div>
          <div className="tabular text-[clamp(2rem,10vh,12rem)] font-black leading-none">
            {closedCount(state.teams[i])}
            <span className="text-[0.4em] font-bold text-white/50">/{MICKEY_TARGETS.length}</span>
          </div>
        </div>
      ))}
      {MICKEY_TARGETS.map((f) => {
        const shut = isShut(state, f);
        return [
          <div
            key={`l${f}`}
            className={`flex items-center justify-end border-t border-white/10 pr-[1.5vw] text-[clamp(1rem,6vh,7rem)] font-black tabular leading-none ${shut ? "text-white/25 line-through decoration-[0.6vh]" : "text-white"}`}
          >
            {fieldLabel(f)}
          </div>,
          ...match.teams.map((t, i) => {
            const status = fieldStatusFor(state, i, f);
            return (
              <div
                key={`${f}-${t.id}`}
                className="mx-[0.4vw] flex items-center justify-center border-t border-white/10"
                style={{
                  background:
                    status === "stengt"
                      ? "rgba(0,0,0,0.45)"
                      : status === "lukket"
                        ? `${teamColor(i)}2e`
                        : i === current
                          ? `${teamColor(i)}10`
                          : undefined,
                }}
              >
                <Marks count={state.teams[i].marks[f]} color={shut ? "#4b5567" : teamColor(i)} className="h-[78%] max-h-[8vh] w-auto text-white" />
              </div>
            );
          }),
        ];
      })}
    </div>
  );
}
