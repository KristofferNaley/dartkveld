/**
 * Mickey Mouse, slik gjengen spiller det. Rene funksjoner uten UI- eller databaseavhengighet.
 *
 * Regler:
 * - Felt som teller: 20–12 og Bull, i valgfri rekkefølge.
 * - Hvert treff teller 1, uansett single, double eller triple. Tastaturet har derfor
 *   bare én multiplikator, og serveren avviser double/triple.
 * - Et felt er lukket for laget etter 3 treff. Treff på et lukket felt teller ikke.
 * - Et felt er stengt når alle lag har lukket det (vises på tavla).
 * - Ingen poeng. Laget som først lukker alle feltene, vinner med en gang.
 */
import { advanceTurn, firstTurn, validateDart, validateSetup } from "../core/engine";
import { BULL, GameRuleError, type BaseGameState, type Dart, type Field, type Game, type MatchSetup, type Multiplier } from "../core/types";

export const MICKEY_TARGETS = [20, 19, 18, 17, 16, 15, 14, 13, 12, BULL] as const;
export type MickeyTarget = (typeof MICKEY_TARGETS)[number];
export const MARKS_TO_CLOSE = 3;

export interface MickeyTeamState {
  marks: Record<MickeyTarget, number>; // 0–3
}

export interface MickeyState extends BaseGameState {
  teams: MickeyTeamState[];
}

export type FieldStatus = "aapen" | "lukket" | "stengt";

function emptyMarks(): Record<MickeyTarget, number> {
  return Object.fromEntries(MICKEY_TARGETS.map((t) => [t, 0])) as Record<MickeyTarget, number>;
}

export function isTarget(field: Field): field is MickeyTarget {
  return (MICKEY_TARGETS as readonly number[]).includes(field);
}

export function hasClosed(team: MickeyTeamState, field: MickeyTarget): boolean {
  return team.marks[field] >= MARKS_TO_CLOSE;
}

export function closedCount(team: MickeyTeamState): number {
  return MICKEY_TARGETS.filter((f) => hasClosed(team, f)).length;
}

export function hasClosedAll(team: MickeyTeamState): boolean {
  return closedCount(team) === MICKEY_TARGETS.length;
}

/** Stengt = alle lag har lukket feltet. */
export function isShut(state: Pick<MickeyState, "teams">, field: MickeyTarget): boolean {
  return state.teams.every((t) => hasClosed(t, field));
}

/** Status for et felt sett fra ett lag. */
export function fieldStatusFor(state: Pick<MickeyState, "teams">, teamIndex: number, field: MickeyTarget): FieldStatus {
  if (isShut(state, field)) return "stengt";
  return hasClosed(state.teams[teamIndex], field) ? "lukket" : "aapen";
}

const SINGLE_ONLY: readonly Multiplier[] = [1];

export const mickeyMouse: Game<MickeyState> = {
  type: "mickey-mouse",
  name: "Mickey Mouse",
  description: "Lukk 20 til 12 og Bull med tre treff hver. Første lag som lukker alt, vinner.",
  minTeams: 2,
  maxTeams: 8,
  dartsPerTurn: 3,
  targets: MICKEY_TARGETS,

  multipliersFor(): readonly Multiplier[] {
    return SINGLE_ONLY;
  },

  init(setup: MatchSetup): MickeyState {
    validateSetup(this, setup);
    return {
      setup,
      turn: firstTurn(setup),
      log: [],
      finished: false,
      winnerTeamIndex: null,
      teams: setup.teams.map(() => ({ marks: emptyMarks() })),
    };
  },

  apply(state: MickeyState, dart: Dart): MickeyState {
    if (state.finished) throw new GameRuleError("Kampen er ferdig");
    validateDart(this, dart);

    const { turn } = state;
    const seq = state.log.length;
    const teams = state.teams.map((t) => ({ marks: { ...t.marks } }));
    const team = teams[turn.teamIndex];
    let marks = 0;

    if (isTarget(dart.field) && !hasClosed(team, dart.field)) {
      team.marks[dart.field] += 1;
      marks = 1;
    }

    const next: MickeyState = {
      ...state,
      teams,
      log: [
        ...state.log,
        { ...dart, seq, round: turn.round, dartIndex: turn.dartIndex, teamIndex: turn.teamIndex, playerId: turn.playerId, marks, points: 0 },
      ],
    };

    if (hasClosedAll(team)) {
      return { ...next, finished: true, winnerTeamIndex: turn.teamIndex };
    }
    return { ...next, turn: advanceTurn(state.setup, turn, this.dartsPerTurn) };
  },
};
