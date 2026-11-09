import "server-only";
import { asc, eq, isNotNull, and } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { dartThrow, match, player, user } from "@/db/schema";
import type { StatDart, StatMatch, StatUser } from "./compute";

/**
 * Henter alle kast fra registrerte brukere for ett spill. For en vennegjeng er dette
 * noen titusen rader i året, så alt regnes ut i minnet per forespørsel.
 */
export const loadStatsData = cache(async (gameType: string) => {
  const [users, dartRows, matchRows] = await Promise.all([
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
    db
      .select({
        matchId: dartThrow.matchId,
        userId: player.userId,
        round: dartThrow.round,
        dartIndex: dartThrow.dartIndex,
        field: dartThrow.field,
        multiplier: dartThrow.multiplier,
        ring: dartThrow.ring,
        createdAt: dartThrow.createdAt,
      })
      .from(dartThrow)
      .innerJoin(player, eq(player.id, dartThrow.playerId))
      .innerJoin(match, eq(match.id, dartThrow.matchId))
      .where(and(eq(match.gameType, gameType), isNotNull(player.userId))),
    db
      .select({
        id: match.id,
        status: match.status,
        createdAt: match.createdAt,
        winnerTeamId: match.winnerTeamId,
        userId: player.userId,
        teamId: player.teamId,
      })
      .from(match)
      .innerJoin(player, eq(player.matchId, match.id))
      .where(and(eq(match.gameType, gameType), isNotNull(player.userId))),
  ]);

  const matches = new Map<string, StatMatch>();
  for (const r of matchRows) {
    let m = matches.get(r.id);
    if (!m) {
      m = { id: r.id, finished: r.status === "finished", createdAt: r.createdAt, winnerTeamId: r.winnerTeamId, players: [] };
      matches.set(r.id, m);
    }
    m.players.push({ userId: r.userId!, teamId: r.teamId });
  }

  return {
    users: users as StatUser[],
    darts: dartRows.map((d) => ({ ...d, userId: d.userId! })) as StatDart[],
    matches: [...matches.values()],
  };
});
