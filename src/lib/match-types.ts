// Serialiserbare typer som deles mellom server og klient.
import type { Dart, MatchSetup } from "@/games/core/types";

export interface MatchPlayerDTO {
  id: string;
  name: string;
  userId: string | null;
}

export interface MatchTeamDTO {
  id: string;
  name: string;
  players: MatchPlayerDTO[];
}

export interface MatchDTO {
  id: string;
  gameType: string;
  status: "active" | "finished";
  ownerId: string;
  shareToken: string | null;
  createdAt: string;
  finishedAt: string | null;
  teams: MatchTeamDTO[];
  /** Alle kast i rekkefølge. Klienten utleder kampstate med samme spillmodul som serveren. */
  throws: Dart[];
  /** Endres ved hvert kast, angre og statusendring. Brukes av polling. */
  version: string;
}

export function setupFromMatch(m: Pick<MatchDTO, "teams">): MatchSetup {
  return {
    teams: m.teams.map((t) => ({ id: t.id, name: t.name, players: t.players.map((p) => ({ id: p.id, name: p.name })) })),
  };
}

export function playerName(m: Pick<MatchDTO, "teams">, playerId: string): string {
  for (const t of m.teams) for (const p of t.players) if (p.id === playerId) return p.name;
  return "Ukjent";
}
