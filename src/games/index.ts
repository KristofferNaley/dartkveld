import type { BaseGameState, Game } from "./core/types";
import { mickeyMouse, mickeyMouseV1 } from "./mickey-mouse/rules";

/**
 * Register over spill. Nye spill (501, 301, Around the Clock) legges til her
 * med egen regelmodul + egen visningskomponent i src/components/games.
 */
export const GAMES = {
  "mickey-mouse": mickeyMouse,
  "mickey-mouse-10": mickeyMouseV1,
} as const;

export type GameType = keyof typeof GAMES;
export const GAME_TYPES = Object.keys(GAMES) as [GameType, ...GameType[]];
/** Spill som kan velges for nye kamper */
export const SELECTABLE_GAME_TYPES = GAME_TYPES.filter((t) => !GAMES[t].hidden) as [GameType, ...GameType[]];

export function getGame(type: string): Game<BaseGameState> {
  const game = (GAMES as Record<string, unknown>)[type];
  if (!game) throw new Error(`Ukjent spilltype: ${type}`);
  return game as unknown as Game<BaseGameState>;
}

export function isGameType(type: string): type is GameType {
  return type in GAMES;
}
