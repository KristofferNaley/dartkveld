import "server-only";
import { asc, eq, isNotNull, and } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { dartThrow, groupMember, match, player, user } from "@/db/schema";
import type { StatDart, StatMatch, StatUser } from "./compute";

/**
 * Henter alle kast fra registrerte brukere for ett spill, i én gruppe (groupId) eller i alle
 * (groupId = null). For en vennegjeng er dette noen titusen rader i året, så alt regnes ut
 * i minnet per forespørsel. Med groupId er det bare gruppas medlemmer som er med i listen.
 */
export const loadStatsData = cache(async (gameType: string, groupId: string | null) => {
  const inGroup = groupId ? eq(match.groupId, groupId) : undefined;
  const [users, dartRows, matchRows] = await Promise.all([
    groupId
      ? db
          .select({ id: user.id, name: user.name })
          .from(groupMember)
          .innerJoin(user, eq(user.id, groupMember.userId))
          .where(eq(groupMember.groupId, groupId))
          .orderBy(asc(user.name))
      : db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
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
      .where(and(eq(match.gameType, gameType), isNotNull(player.userId), inGroup)),
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
      .where(and(eq(match.gameType, gameType), isNotNull(player.userId), inGroup)),
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
