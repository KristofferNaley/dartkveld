/**
 * Mickey Mouse, slik gjengen spiller det. Rene funksjoner uten UI- eller databaseavhengighet.
 *
 * Regler:
 * - Felt som teller: 20–15, Dobbel, Trippel og Bull, i valgfri rekkefølge.
 * - Pila registreres slik den landet: tall og ring (single, dobbel, trippel).
 *   Treff på tall 15–20 teller 1 (single), 2 (dobbel) eller 3 (trippel) treff på tallet.
 *   Dobbel og trippel på 15–20 kan i stedet fordeles: ett treff på Dobbel-/Trippel-feltet og resten på tallet
 *   (T19: 3 på 19, eller 2 på 19 + 1 på Trippel, eller bare 1 på Trippel). Den som fører velger. En dobbel/trippel på 1–14 teller bare på Dobbel/Trippel.
 *   En single på 1–14 er bom.
 * - Bull (grønn, ytre) gir 1 treff, Bullseye (rød, midten) gir 2 treff, begge på Bull. Bullseye er ikke en Dobbel.
 * - Et felt er lukket for laget etter 3 treff. Treff utover 3 og treff på et lukket felt teller ikke.
 * - Et felt er stengt når alle lag har lukket det (vises på tavla).
 * - Ingen poeng. Laget som først lukker alle feltene, vinner med en gang.
 * - Eldre kast har feltkode 102/103 (Dobbel/Trippel uten tall) og teller 1 treff på ringen.
 */
import { advanceTurn, firstTurn, validateSetup } from "../core/engine";
import {
  ANY_DOUBLE,
  ANY_TRIPLE,
  BULL,
  GameRuleError,
  MISS,
  type BaseGameState,
  type Dart,
  type Field,
  type Game,
  type MatchSetup,
  type Multiplier,
} from "../core/types";

export const MICKEY_TARGETS: readonly Field[] = [20, 19, 18, 17, 16, 15, ANY_DOUBLE, ANY_TRIPLE, BULL];
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

/** Laveste tall som er et eget felt. Tall under dette teller bare som dobbel/trippel. */
const LOWEST_NUMBER_TARGET = 15;

export interface Hit {
  field: Field;
  marks: number;
}

/**
 * Hvilke felt og hvor mange treff en pil gir, før lukking og tak på 3 er regnet inn.
 * Kaster GameRuleError hvis kastet er ugyldig i Mickey Mouse. Bom gir ingen treff.
 */
export function hitsFor(dart: Dart): Hit[] {
  const { field, multiplier } = dart;
  if (field === MISS) {
    if (multiplier !== 1 || dart.ring) throw new GameRuleError("Bom kan ikke ha ring");
    return [];
  }
  if (field === ANY_DOUBLE || field === ANY_TRIPLE) {
    if (multiplier !== 1 || dart.ring) throw new GameRuleError("Ugyldig kast");
    return [{ field, marks: 1 }];
  }
  if (field === BULL) {
    if (multiplier === 3 || dart.ring) throw new GameRuleError("Bull har bare Bull (1) og Bullseye (2)");
    return [{ field: BULL, marks: multiplier }];
  }
  if (!Number.isInteger(field) || field < 1 || field > 20) throw new GameRuleError(`Ugyldig felt: ${field}`);
  if (dart.numberMarks !== undefined && !dart.ring) throw new GameRuleError("Ugyldig kast");
  if (multiplier === 1) {
    if (dart.ring) throw new GameRuleError("Single kan ikke telle på Dobbel eller Trippel");
    if (field < LOWEST_NUMBER_TARGET) throw new GameRuleError(`Single på ${field} teller ikke. Registrer en bom.`);
    return [{ field, marks: 1 }];
  }
  const ringField = multiplier === 2 ? ANY_DOUBLE : ANY_TRIPLE;
  if (field < LOWEST_NUMBER_TARGET) return [{ field: ringField, marks: 1 }];
  if (!dart.ring) return [{ field, marks: multiplier }];
  // Pila deles mellom tallet og ringen: ett treff på ringen, resten (0 til multiplier-1) på tallet
  const onNumber = dart.numberMarks ?? 0;
  if (!Number.isInteger(onNumber) || onNumber < 0 || onNumber >= multiplier) throw new GameRuleError("Ugyldig fordeling av treff");
  return onNumber > 0 ? [{ field, marks: onNumber }, { field: ringField, marks: 1 }] : [{ field: ringField, marks: 1 }];
}

/** Treff pila ville gitt på et åpent felt, uten å regne med lukking. Brukes av statistikken. */
export function rawMarks(dart: Dart): number {
  try {
    return hitsFor(dart).reduce((n, h) => n + h.marks, 0);
  } catch {
    return 0;
  }
}

export const mickeyMouse: Game<MickeyState> = {
  type: "mickey-mouse",
  name: "Mickey Mouse",
  description: "Lukk 20 til 15, Dobbel, Trippel og Bull med tre treff hver. Første lag som lukker alt, vinner.",
  minTeams: 2,
  maxTeams: 8,
  dartsPerTurn: 3,
  targets: MICKEY_TARGETS,

  multipliersFor(field: Field): readonly Multiplier[] {
    if (field === BULL) return [1, 2];
    if (field === ANY_DOUBLE || field === ANY_TRIPLE) return [1];
    return [1, 2, 3];
  },

  init(setup: MatchSetup): MickeyState {
    validateSetup(this, setup);
    return {
      setup,
      turn: firstTurn(setup),
      log: [],
      finished: false,
      winnerTeamIndex: null,
      targets: MICKEY_TARGETS,
      teams: setup.teams.map(() => ({ marks: Object.fromEntries(MICKEY_TARGETS.map((t) => [t, 0])) })),
    };
  },

  apply(state: MickeyState, dart: Dart): MickeyState {
    if (state.finished) throw new GameRuleError("Kampen er ferdig");
    const hits = hitsFor(dart);

    const { turn } = state;
    const seq = state.log.length;
    const teams = state.teams.map((t) => ({ marks: { ...t.marks } }));
    const team = teams[turn.teamIndex];
    let marks = 0;

    for (const hit of hits) {
      if (!MICKEY_TARGETS.includes(hit.field)) continue;
      // Treff utover tre forsvinner
      const added = Math.min(hit.marks, MARKS_TO_CLOSE - team.marks[hit.field]);
      team.marks[hit.field] += added;
      marks += added;
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
