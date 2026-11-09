import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { dartThrow, groupMember, match, player, team, user } from "@/db/schema";
import { replay } from "@/games/core/engine";
import { GameRuleError, type Dart } from "@/games/core/types";
import { getGame } from "@/games";
import { newMatchCode } from "./codes";
import { setupFromMatch, type MatchDTO } from "./match-types";
import type { NewMatchInput } from "./validation";

export class MatchError extends Error {
  constructor(
    public status: number,
    message: string,
    public match?: MatchDTO,
  ) {
    super(message);
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export function teamNameFor(index: number): string {
  return `Lag ${index + 1}`;
}

export function newShareToken(): string {
  return randomBytes(18).toString("base64url");
}

async function fetchMatch(ex: Executor, where: ReturnType<typeof eq>): Promise<MatchDTO | null> {
  const row = await ex.query.match.findFirst({
    where,
    with: {
      owner: { columns: { name: true } },
      teams: {
        orderBy: [asc(team.position)],
        with: { players: { orderBy: [asc(player.position)], with: { user: { columns: { name: true } } } } },
      },
      throws: { orderBy: [asc(dartThrow.seq)], columns: { id: true, field: true, multiplier: true, ring: true } },
    },
  });
  if (!row) return null;
  const last = row.throws.at(-1);
  return {
    id: row.id,
    number: row.number,
    groupId: row.groupId,
    code: row.code,
    gameType: row.gameType,
    status: row.status,
    ownerId: row.ownerId,
    ownerName: row.owner.name,
    shareToken: row.shareToken,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    teams: row.teams.map((t) => ({
      id: t.id,
      name: t.name,
      players: t.players.map((p) => ({ id: p.id, userId: p.userId, name: p.user?.name ?? p.guestName ?? p.nameSnapshot })),
    })),
    throws: row.throws.map((t) => ({
      field: t.field,
      multiplier: t.multiplier as Dart["multiplier"],
      ...(t.ring ? { ring: true } : {}),
    })),
    version: `${row.throws.length}.${last?.id ?? 0}.${row.status}.${row.shareToken ? 1 : 0}`,
  };
}

export function getMatch(id: string, ex: Executor = db) {
  return fetchMatch(ex, eq(match.id, id));
}

export function getMatchByShareToken(token: string) {
  return fetchMatch(db, eq(match.shareToken, token));
}

export function getMatchByCode(code: string) {
  return fetchMatch(db, eq(match.code, code));
}

export function isParticipant(m: MatchDTO, userId: string): boolean {
  return m.teams.some((t) => t.players.some((p) => p.userId === userId));
}

export function canScore(m: MatchDTO, userId: string): boolean {
  return m.ownerId === userId || isParticipant(m, userId);
}

export function matchState(m: MatchDTO) {
  return replay(getGame(m.gameType), setupFromMatch(m), m.throws);
}

/** Lås kampen, sjekk tilgang og versjon, og kjør endringen i én transaksjon. */
async function mutate(
  matchId: string,
  userId: string,
  expectedSeq: number,
  fn: (tx: Tx, m: MatchDTO) => Promise<void>,
): Promise<MatchDTO> {
  return db.transaction(async (tx) => {
    const locked = await tx.select({ id: match.id }).from(match).where(eq(match.id, matchId)).for("update");
    if (locked.length === 0) throw new MatchError(404, "Fant ikke kampen");
    const m = (await getMatch(matchId, tx))!;
    if (!canScore(m, userId)) throw new MatchError(403, "Bare deltakere og eier kan føre poeng");
    if (m.throws.length !== expectedSeq) {
      throw new MatchError(409, "Kampen ble oppdatert fra en annen enhet. Sjekk tavla og prøv igjen.", m);
    }
    await fn(tx, m);
    return (await getMatch(matchId, tx))!;
  });
}

export async function registerDarts(matchId: string, userId: string, expectedSeq: number, darts: Dart[]) {
  return mutate(matchId, userId, expectedSeq, async (tx, m) => {
    if (m.status !== "active") throw new MatchError(400, "Kampen er ferdig");
    const game = getGame(m.gameType);
    let state = matchState(m);
    const rows: (typeof dartThrow.$inferInsert)[] = [];
    for (const dart of darts) {
      if (state.finished) break; // resten av pilene etter vinnerkastet ignoreres
      const turn = state.turn;
      try {
        state = game.apply(state, dart);
      } catch (err) {
        if (err instanceof GameRuleError) throw new MatchError(400, err.message);
        throw err;
      }
      rows.push({
        matchId,
        playerId: turn.playerId,
        seq: state.log.length - 1,
        round: turn.round,
        dartIndex: turn.dartIndex,
        field: dart.field,
        multiplier: dart.multiplier,
        ring: dart.ring === true,
      });
    }
    if (rows.length) await tx.insert(dartThrow).values(rows);
    if (state.finished && state.winnerTeamIndex !== null) {
      await tx
        .update(match)
        .set({
          status: "finished",
          finishedAt: new Date(),
          winnerTeamId: m.teams[state.winnerTeamIndex].id,
          shareToken: newShareToken(),
        })
        .where(eq(match.id, matchId));
    }
  });
}

export async function undoLastDart(matchId: string, userId: string, expectedSeq: number) {
  return mutate(matchId, userId, expectedSeq, async (tx, m) => {
    if (m.throws.length === 0) throw new MatchError(400, "Ingen kast å angre");
    await tx.delete(dartThrow).where(and(eq(dartThrow.matchId, matchId), eq(dartThrow.seq, m.throws.length - 1)));
    if (m.status === "finished") {
      // Kampen er ikke lenger avgjort. Delingslenken trekkes tilbake og lages på nytt når kampen avsluttes.
      await tx
        .update(match)
        .set({ status: "active", finishedAt: null, winnerTeamId: null, shareToken: null })
        .where(eq(match.id, matchId));
    }
  });
}

export async function createMatch(ownerId: string, groupId: string, input: NewMatchInput): Promise<string> {
  const userIds = input.teams.flatMap((t) => t.players.flatMap((p) => (p.kind === "user" ? [p.userId] : [])));
  // Registrerte spillere må være med i gruppa kampen opprettes i
  const users = userIds.length
    ? await db
        .select({ id: user.id, name: user.name })
        .from(groupMember)
        .innerJoin(user, eq(user.id, groupMember.userId))
        .where(and(eq(groupMember.groupId, groupId), inArray(groupMember.userId, userIds)))
    : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  for (const id of userIds) if (!names.has(id)) throw new MatchError(400, "Alle spillere må være med i gruppa");

  return db.transaction(async (tx) => {
    // Kampkoden er unik. Kollisjoner er sjeldne (32^5), men prøv på nytt hvis det skjer.
    let m: { id: string } | undefined;
    for (let attempt = 0; !m; attempt++) {
      const rows = await tx
        .insert(match)
        .values({ gameType: input.gameType, ownerId, groupId, code: newMatchCode() })
        .onConflictDoNothing({ target: match.code })
        .returning({ id: match.id });
      m = rows[0];
      if (!m && attempt >= 5) throw new MatchError(500, "Kunne ikke lage kampkode");
    }
    for (const [ti, t] of input.teams.entries()) {
      // Lagene heter alltid Lag 1, Lag 2 ... (deltakerne vises ved siden av)
      const [tr] = await tx.insert(team).values({ matchId: m.id, name: teamNameFor(ti), position: ti }).returning({ id: team.id });
      await tx.insert(player).values(
        t.players.map((p, pi) => ({
          matchId: m.id,
          teamId: tr.id,
          position: pi,
          userId: p.kind === "user" ? p.userId : null,
          guestName: p.kind === "guest" ? p.name : null,
          nameSnapshot: p.kind === "user" ? names.get(p.userId)! : p.name,
        })),
      );
    }
    return m.id;
  });
}

export async function deleteMatch(matchId: string, userId: string) {
  const res = await db.delete(match).where(and(eq(match.id, matchId), eq(match.ownerId, userId))).returning({ id: match.id });
  if (res.length === 0) throw new MatchError(403, "Bare eieren kan slette kampen");
}

export async function setSharing(matchId: string, userId: string, enabled: boolean) {
  const res = await db
    .update(match)
    .set({ shareToken: enabled ? newShareToken() : null })
    .where(and(eq(match.id, matchId), eq(match.ownerId, userId), eq(match.status, "finished")))
    .returning({ token: match.shareToken });
  if (res.length === 0) throw new MatchError(403, "Bare eieren kan endre deling av en ferdig kamp");
  return res[0].token;
}

/** Alle kampene i en gruppe, nyeste først. «mine» og «isOwner» gjelder innlogget bruker. */
export async function listMatchesForGroup(groupId: string, userId: string, limit = 50) {
  const rows = await db.query.match.findMany({
    where: eq(match.groupId, groupId),
    orderBy: [desc(match.createdAt)],
    limit,
    with: {
      owner: { columns: { name: true } },
      teams: {
        orderBy: [asc(team.position)],
        with: { players: { orderBy: [asc(player.position)], with: { user: { columns: { name: true } } } } },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    ownerName: r.owner.name,
    gameType: r.gameType,
    status: r.status,
    createdAt: r.createdAt,
    finishedAt: r.finishedAt,
    winnerTeamId: r.winnerTeamId,
    isOwner: r.ownerId === userId,
    teams: r.teams.map((t) => ({
      id: t.id,
      name: t.name,
      mine: t.players.some((p) => p.userId === userId),
      players: t.players.map((p) => p.user?.name ?? p.guestName ?? p.nameSnapshot),
    })),
  }));
}

/** Seire og kamper for en bruker, i én gruppe eller (groupId = null) i alle. */
export async function statsForUser(userId: string, groupId: string | null) {
  const [row] = await db
    .select({
      played: sql<number>`count(distinct ${match.id})::int`,
      won: sql<number>`count(distinct ${match.id}) filter (where ${match.winnerTeamId} = ${player.teamId})::int`,
    })
    .from(player)
    .innerJoin(match, eq(match.id, player.matchId))
    .where(and(eq(player.userId, userId), eq(match.status, "finished"), groupId ? eq(match.groupId, groupId) : undefined));
  const played = row?.played ?? 0;
  const won = row?.won ?? 0;
  return { played, won, winRate: played ? won / played : 0 };
}
