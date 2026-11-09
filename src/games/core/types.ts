// Felles typer for alle spill. Ingen avhengigheter til UI eller database.

export type Multiplier = 1 | 2 | 3;

/** Felt: 1–20 for tallfelt, 25 for bull, 0 for bom, 102/103 for dobbel-/trippelringen. */
export type Field = number;
export const MISS: Field = 0;
export const BULL: Field = 25;
/** Spesialfelt: et treff hvor som helst i dobbelringen / trippelringen (f.eks. i Mickey Mouse). */
export const ANY_DOUBLE: Field = 102;
export const ANY_TRIPLE: Field = 103;

export interface Dart {
  /** Feltet pila faktisk traff: 1–20, 25 (bull), 0 (bom). Eldre kast kan ha 102/103 (dobbel-/trippelringen uten tall). */
  field: Field;
  /** Ringen pila traff: 1 = single, 2 = dobbel (Bullseye på 25), 3 = trippel. */
  multiplier: Multiplier;
  /**
   * Bare for dobbel/trippel på 15–20: pila telte på Dobbel-/Trippel-feltet i stedet for tallet.
   * Mangler den, teller pila på tallet.
   */
  ring?: boolean;
}

export interface PlayerSetup {
  id: string;
  name: string;
}

export interface TeamSetup {
  id: string;
  name: string;
  players: PlayerSetup[];
}

export interface MatchSetup {
  teams: TeamSetup[];
}

/** Hvem som skal kaste neste pil. round er 0-basert. */
export interface TurnPosition {
  round: number;
  teamIndex: number;
  dartIndex: number; // 0–2
  playerId: string;
}

/** Ett registrert kast slik spillet tolket det. */
export interface LoggedDart extends Dart {
  seq: number;
  round: number;
  dartIndex: number;
  teamIndex: number;
  playerId: string;
  /** Treff som telte mot lukking (spillspesifikt, 0 hvis ikke relevant). */
  marks: number;
  /** Poeng laget fikk for dette kastet. */
  points: number;
}

export interface BaseGameState {
  setup: MatchSetup;
  turn: TurnPosition;
  log: LoggedDart[];
  finished: boolean;
  winnerTeamIndex: number | null;
}

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

/**
 * Et spill er et sett rene funksjoner. Kampstate utledes alltid ved å spille av
 * kastlisten fra start med init + apply, så angre er bare «spill av alle unntatt siste».
 */
export interface Game<S extends BaseGameState = BaseGameState> {
  type: string;
  name: string;
  description: string;
  /** Skjult spill kan ikke velges for nye kamper (eldre regelvarianter). */
  hidden?: boolean;
  minTeams: number;
  maxTeams: number;
  dartsPerTurn: number;
  /** Felt som vises på tastaturet, i visningsrekkefølge (bom kommer i tillegg). */
  targets: readonly Field[];
  /** Hvilke multiplikatorer som er lovlige for et felt. */
  multipliersFor(field: Field): readonly Multiplier[];
  init(setup: MatchSetup): S;
  /** Returnerer ny state. Kaster GameRuleError ved ulovlig kast eller ferdig kamp. */
  apply(state: S, dart: Dart): S;
}
