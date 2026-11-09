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
  type TurnPosition,
} from "./types";

/** Spilleren som kaster for laget i en gitt runde. Rekkefølgen roterer automatisk. */
export function playerForRound(setup: MatchSetup, teamIndex: number, round: number): string {
  const players = setup.teams[teamIndex].players;
  return players[round % players.length].id;
}

export function firstTurn(setup: MatchSetup): TurnPosition {
  return { round: 0, teamIndex: 0, dartIndex: 0, playerId: playerForRound(setup, 0, 0) };
}

/** Neste posisjon etter én pil: tre piler per lag, så neste lag, så ny runde. */
export function advanceTurn(setup: MatchSetup, turn: TurnPosition, dartsPerTurn = 3): TurnPosition {
  if (turn.dartIndex + 1 < dartsPerTurn) {
    return { ...turn, dartIndex: turn.dartIndex + 1 };
  }
  const teamIndex = (turn.teamIndex + 1) % setup.teams.length;
  const round = teamIndex === 0 ? turn.round + 1 : turn.round;
  return { round, teamIndex, dartIndex: 0, playerId: playerForRound(setup, teamIndex, round) };
}

export function validateSetup(game: Game, setup: MatchSetup): void {
  if (setup.teams.length < game.minTeams) {
    throw new GameRuleError(`${game.name} krever minst ${game.minTeams} lag`);
  }
  if (setup.teams.length > game.maxTeams) {
    throw new GameRuleError(`${game.name} tillater maks ${game.maxTeams} lag`);
  }
  for (const team of setup.teams) {
    if (team.players.length === 0) throw new GameRuleError(`Laget «${team.name}» har ingen spillere`);
  }
}

export function validateDart(game: Game, dart: Dart): void {
  if (dart.field === 0) {
    if (dart.multiplier !== 1) throw new GameRuleError("Bom kan ikke ha multiplikator");
    return;
  }
  if (!game.targets.includes(dart.field)) {
    throw new GameRuleError(`Feltet ${dart.field} teller ikke i ${game.name}`);
  }
  if (!game.multipliersFor(dart.field).includes(dart.multiplier)) {
    throw new GameRuleError("Ugyldig multiplikator for feltet");
  }
}

/** Spill av en hel kastliste fra start. */
export function replay<S extends BaseGameState>(game: Game<S>, setup: MatchSetup, darts: readonly Dart[]): S {
  return darts.reduce((state, dart) => game.apply(state, dart), game.init(setup));
}

/** Angre siste kast: spill av alle unntatt det siste. */
export function undoLast<S extends BaseGameState>(game: Game<S>, setup: MatchSetup, darts: readonly Dart[]): S {
  return replay(game, setup, darts.slice(0, -1));
}

export interface TeamRound {
  teamIndex: number;
  playerId: string;
  darts: Dart[];
  marks: number;
  points: number;
}

/** Runde-for-runde-oversikt bygget fra loggen (felles for alle spill). */
export function roundsSummary(state: BaseGameState): TeamRound[][] {
  const rounds: TeamRound[][] = [];
  for (const d of state.log) {
    const round = (rounds[d.round] ??= []);
    let entry = round.find((r) => r.teamIndex === d.teamIndex);
    if (!entry) {
      entry = { teamIndex: d.teamIndex, playerId: d.playerId, darts: [], marks: 0, points: 0 };
      round.push(entry);
    }
    entry.darts.push(
      d.ring
        ? { field: d.field, multiplier: d.multiplier, ring: true, ...(d.numberMarks ? { numberMarks: d.numberMarks } : {}) }
        : { field: d.field, multiplier: d.multiplier },
    );
    entry.marks += d.marks;
    entry.points += d.points;
  }
  return rounds;
}

/** Visningsnavn for et felt. */
export function fieldName(field: Field): string {
  if (field === MISS) return "Bom";
  if (field === BULL) return "Bull";
  if (field === ANY_DOUBLE) return "Dobbel";
  if (field === ANY_TRIPLE) return "Trippel";
  return String(field);
}

export function formatDart(dart: Dart): string {
  if (dart.field === MISS || dart.field === ANY_DOUBLE || dart.field === ANY_TRIPLE) return fieldName(dart.field);
  if (dart.field === BULL) return dart.multiplier === 2 ? "Bullseye" : "Bull";
  const prefix = dart.multiplier === 3 ? "T" : dart.multiplier === 2 ? "D" : "";
  const text = prefix + fieldName(dart.field);
  if (!dart.ring) return text;
  // Pila gir treff på ringen: «T20 → Trippel» eller, delt med tallet, «T20 → 2×20 + Trippel»
  const ring = dart.multiplier === 3 ? "Trippel" : "Dobbel";
  return dart.numberMarks ? `${text} → ${dart.numberMarks}×${dart.field} + ${ring}` : `${text} → ${ring}`;
}
