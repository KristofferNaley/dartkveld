/**
 * Mickey Mouse (cricket-variant). Rene funksjoner uten UI- eller databaseavhengighet.
 *
 * Regler:
 * - Felt som teller: 20–12 og Bull.
 * - Et felt lukkes med 3 treff (single 1, double 2, triple 3; Bull single 1, double 2).
 * - Har laget lukket feltet og minst én motstander ikke har det, gir overskytende
 *   treff poeng lik feltets verdi (Bull = 25).
 * - Et felt er stengt når alle lag har lukket det. Stengte felt gir ingen poeng.
 * - Vinner: første lag som har lukket alle felt og har minst like mange poeng som
 *   hvert av de andre lagene. Ved likhet vinner laget som lukket alt (det var først).
 * - Har alle lag lukket alt uten at noen har vunnet, vinner høyeste poengsum
 *   (ved likhet: laget som lukket alt først).
 */
import { advanceTurn, firstTurn, validateDart, validateSetup } from "../core/engine";
import { BULL, GameRuleError, type BaseGameState, type Dart, type Field, type Game, type MatchSetup, type Multiplier } from "../core/types";

export const MICKEY_TARGETS = [20, 19, 18, 17, 16, 15, 14, 13, 12, BULL] as const;
export type MickeyTarget = (typeof MICKEY_TARGETS)[number];
export const MARKS_TO_CLOSE = 3;

export interface MickeyTeamState {
  marks: Record<MickeyTarget, number>; // 0–3
  score: number;
  /** seq-nummeret til kastet der laget lukket siste felt, ellers null */
  closedAllAtSeq: number | null;
}

export interface MickeyState extends BaseGameState {
  teams: MickeyTeamState[];
}

export type FieldStatus = "aapen" | "lukket" | "stengt";

function emptyMarks(): Record<MickeyTarget, number> {
  return Object.fromEntries(MICKEY_TARGETS.map((t) => [t, 0])) as Record<MickeyTarget, number>;
}

export function fieldValue(field: Field): number {
  return field === BULL ? 25 : field;
}

export function isTarget(field: Field): field is MickeyTarget {
  return (MICKEY_TARGETS as readonly number[]).includes(field);
}

export function hasClosed(team: MickeyTeamState, field: MickeyTarget): boolean {
  return team.marks[field] >= MARKS_TO_CLOSE;
}

export function hasClosedAll(team: MickeyTeamState): boolean {
  return MICKEY_TARGETS.every((f) => hasClosed(team, f));
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

export function determineWinner(state: Pick<MickeyState, "teams">, candidate: number): number | null {
  const teams = state.teams;
  const me = teams[candidate];
  if (hasClosedAll(me) && teams.every((t, i) => i === candidate || me.score >= t.score)) {
    return candidate;
  }
  // Reserve: alle har lukket alt, men ingen oppfylte vinnerkravet underveis
  if (teams.every(hasClosedAll)) {
    let best = 0;
    for (let i = 1; i < teams.length; i++) {
      const t = teams[i];
      const b = teams[best];
      if (t.score > b.score || (t.score === b.score && (t.closedAllAtSeq ?? Infinity) < (b.closedAllAtSeq ?? Infinity))) {
        best = i;
      }
    }
    return best;
  }
  return null;
}

export const mickeyMouse: Game<MickeyState> = {
  type: "mickey-mouse",
  name: "Mickey Mouse",
  description: "Lukk 20 til 12 og Bull med tre treff hver. Overskytende treff gir poeng så lenge motstanderne ikke har lukket.",
  minTeams: 2,
  maxTeams: 8,
  dartsPerTurn: 3,
  targets: MICKEY_TARGETS,

  multipliersFor(field: Field): readonly Multiplier[] {
    return field === BULL ? [1, 2] : [1, 2, 3];
  },

  init(setup: MatchSetup): MickeyState {
    validateSetup(this, setup);
    return {
      setup,
      turn: firstTurn(setup),
      log: [],
      finished: false,
      winnerTeamIndex: null,
      teams: setup.teams.map(() => ({ marks: emptyMarks(), score: 0, closedAllAtSeq: null })),
    };
  },

  apply(state: MickeyState, dart: Dart): MickeyState {
    if (state.finished) throw new GameRuleError("Kampen er ferdig");
    validateDart(this, dart);

    const { turn } = state;
    const seq = state.log.length;
    const teams = state.teams.map((t) => ({ ...t, marks: { ...t.marks } }));
    const team = teams[turn.teamIndex];
    let marks = 0;
    let points = 0;

    if (isTarget(dart.field)) {
      const field = dart.field;
      const before = team.marks[field];
      marks = Math.min(dart.multiplier, MARKS_TO_CLOSE - before);
      const excess = dart.multiplier - marks;
      team.marks[field] = before + marks;
      const opponentOpen = teams.some((t, i) => i !== turn.teamIndex && !hasClosed(t, field));
      if (excess > 0 && opponentOpen) {
        points = excess * fieldValue(field);
        team.score += points;
      }
      if (team.closedAllAtSeq === null && hasClosedAll(team)) team.closedAllAtSeq = seq;
    }

    const next: MickeyState = {
      ...state,
      teams,
      log: [
        ...state.log,
        { ...dart, seq, round: turn.round, dartIndex: turn.dartIndex, teamIndex: turn.teamIndex, playerId: turn.playerId, marks, points },
      ],
    };

    const winner = determineWinner(next, turn.teamIndex);
    if (winner !== null) {
      return { ...next, finished: true, winnerTeamIndex: winner };
    }
    return { ...next, turn: advanceTurn(state.setup, turn, this.dartsPerTurn) };
  },
};
