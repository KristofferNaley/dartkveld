import type { ComponentType } from "react";
import type { BaseGameState } from "@/games/core/types";
import { closedCount, type MickeyState } from "@/games/mickey-mouse/rules";
import type { MatchDTO } from "@/lib/match-types";
import { Legend, MickeyBoard, MickeyTvBoard } from "./mickey-mouse/MickeyBoard";

type BoardProps = { match: MatchDTO; state: BaseGameState };

export interface GameUi {
  /** Kompakt tavle (poengføring, delingsside) */
  Board: ComponentType<BoardProps & { highlightTurn?: boolean }>;
  /** Fullskjermtavle for TV/AirPlay */
  TvBoard: ComponentType<BoardProps>;
  TvLegend?: ComponentType;
  /** Kort stilling per lag, f.eks. for delingssiden og OG-bildet */
  scoreText(state: BaseGameState, teamIndex: number): string;
  /** Hva stillingen betyr, f.eks. «felt lukket» eller «poeng igjen» */
  scoreLabel: string;
}

const mickeyUi: GameUi = {
    Board: (p) => <MickeyBoard {...p} state={p.state as MickeyState} />,
    TvBoard: (p) => <MickeyTvBoard {...p} state={p.state as MickeyState} />,
    TvLegend: () => <Legend big />,
    scoreText: (s, i) => `${closedCount((s as MickeyState).teams[i])}/${(s as MickeyState).targets.length}`,
    scoreLabel: "felt lukket",
};

/** Visningskomponenter per spill. Nye spill registreres her ved siden av src/games/index.ts. */
export const GAME_UI: Record<string, GameUi> = {
  "mickey-mouse": mickeyUi,
  "mickey-mouse-10": mickeyUi,
};



export function getGameUi(type: string): GameUi {
  const ui = GAME_UI[type];
  if (!ui) throw new Error(`Mangler visning for spilltype ${type}`);
  return ui;
}
