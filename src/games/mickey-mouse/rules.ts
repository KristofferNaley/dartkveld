/**
 * Mickey Mouse, slik gjengen spiller det. Rene funksjoner uten UI- eller databaseavhengighet.
 *
 * Regler:
 * - Felt som teller: 20–15, Dobbel, Trippel og Bull, i valgfri rekkefølge.
 *   Dobbel = et treff hvor som helst i dobbelringen, Trippel = hvor som helst i trippelringen.
 *   Den som fører velger hvilket felt pila teller på.
 * - Hvert treff teller 1. Tastaturet har derfor ikke multiplikatorvalg, og serveren
 *   avviser double/triple som multiplikator.
 * - Et felt er lukket for laget etter 3 treff. Treff på et lukket felt teller ikke.
 * - Et felt er stengt når alle lag har lukket det (vises på tavla).
 * - Ingen poeng. Laget som først lukker alle feltene, vinner med en gang.
 *
 * Kamper spilt med den første regelversjonen (20–12 og Bull) bruker varianten
 * «mickey-mouse-10», så gamle kamper beholder resultatet sitt.
 */
import { advanceTurn, firstTurn, validateDart, validateSetup } from "../core/engine";
import {
  ANY_DOUBLE,
  ANY_TRIPLE,
  BULL,
  GameRuleError,
  type BaseGameState,
  type Dart,
  type Field,
  type Game,
  type MatchSetup,
  type Multiplier,
} from "../core/types";

export const MICKEY_TARGETS: readonly Field[] = [20, 19, 18, 17, 16, 15, ANY_DOUBLE, ANY_TRIPLE, BULL];
export const MICKEY_TARGETS_V1: readonly Field[] = [20, 19, 18, 17, 16, 15, 14, 13, 12, BULL];
export const MARKS_TO_CLOSE = 3;

export interface MickeyTeamState {
  /** Treff per felt (0–3). Inneholder nøyaktig spillets felt. */
  marks: Record<number, number>;
}

export interface MickeyState extends BaseGameState {
  targets: readonly Field[];
  teams: MickeyTeamState[];
}

export type FieldStatus = "aapen" | "lukket" | "stengt";

export function hasClosed(team: MickeyTeamState, field: Field): boolean {
  return (team.marks[field] ?? 0) >= MARKS_TO_CLOSE;
}

export function closedCount(team: MickeyTeamState): number {
  return Object.values(team.marks).filter((m) => m >= MARKS_TO_CLOSE).length;
}

export function hasClosedAll(team: MickeyTeamState): boolean {
  return Object.values(team.marks).every((m) => m >= MARKS_TO_CLOSE);
}

/** Stengt = alle lag har lukket feltet. */
export function isShut(state: Pick<MickeyState, "teams">, field: Field): boolean {
  return state.teams.every((t) => hasClosed(t, field));
}

/** Status for et felt sett fra ett lag. */
export function fieldStatusFor(state: Pick<MickeyState, "teams">, teamIndex: number, field: Field): FieldStatus {
  if (isShut(state, field)) return "stengt";
  return hasClosed(state.teams[teamIndex], field) ? "lukket" : "aapen";
}

const SINGLE_ONLY: readonly Multiplier[] = [1];

function createMickeyMouse(opts: { type: string; targets: readonly Field[]; hidden?: boolean; description: string }): Game<MickeyState> {
  return {
    type: opts.type,
    name: "Mickey Mouse",
    description: opts.description,
    hidden: opts.hidden,
    minTeams: 2,
    maxTeams: 8,
    dartsPerTurn: 3,
    targets: opts.targets,

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
        targets: opts.targets,
        teams: setup.teams.map(() => ({ marks: Object.fromEntries(opts.targets.map((t) => [t, 0])) })),
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

      if (opts.targets.includes(dart.field) && !hasClosed(team, dart.field)) {
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
}

export const mickeyMouse = createMickeyMouse({
  type: "mickey-mouse",
  targets: MICKEY_TARGETS,
  description: "Lukk 20 til 15, Dobbel, Trippel og Bull med tre treff hver. Første lag som lukker alt, vinner.",
});

/** Eldre variant (20–12 og Bull). Brukes bare av kamper som allerede er spilt. */
export const mickeyMouseV1 = createMickeyMouse({
  type: "mickey-mouse-10",
  targets: MICKEY_TARGETS_V1,
  hidden: true,
  description: "Mickey Mouse med 20 til 12 og Bull (eldre variant).",
});
