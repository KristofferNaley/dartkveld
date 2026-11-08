/**
 * Statistikk regnet ut fra lagrede kast. Rene funksjoner uten database, så de kan testes.
 *
 * Definisjoner:
 * - Treff: pila traff et felt som teller i spillet (alt unntatt «Bom»). Vi lagrer hva pila
 *   telte på, ikke nøyaktig hvor den landet, så et treff på 14 i Mickey Mouse er en bom.
 * - Treff per runde: treff / piler × 3 (vanlig mål i cricket-dart, «marks per round»).
 * - Runde: én spillers tur med opptil tre piler i en kamp.
 * - Bare registrerte brukere har statistikk. Gjester telles ikke.
 */
import { MISS, type Field } from "@/games/core/types";

export interface StatDart {
  matchId: string;
  userId: string;
  round: number;
  dartIndex: number;
  field: Field;
  createdAt: Date;
}

export interface StatMatch {
  id: string;
  finished: boolean;
  createdAt: Date;
  winnerTeamId: string | null;
  /** Registrerte spillere i kampen (gjester er utelatt) */
  players: { userId: string; teamId: string }[];
}

export interface StatUser {
  id: string;
  name: string;
}

export interface TurnSummary {
  matchId: string;
  userId: string;
  round: number;
  darts: number;
  hits: number;
  createdAt: Date;
}

export interface FormPoint {
  matchId: string;
  date: Date;
  darts: number;
  hits: number;
  mpr: number;
  won: boolean | null; // null = kampen pågår
}

export interface PlayerStats {
  userId: string;
  darts: number;
  hits: number;
  hitRate: number;
  mpr: number;
  matches: number;
  wins: number;
  winRate: number;
  fields: { field: Field; hits: number }[];
  favoriteField: Field | null;
  weakestField: Field | null;
  turns: number;
  bestTurn: TurnSummary | null;
  perfectTurns: number;
  blankTurns: number;
  byDartIndex: { index: number; darts: number; hits: number; rate: number }[];
  form: FormPoint[];
}

const isHit = (d: StatDart) => d.field !== MISS;
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Grupper kast i runder (én spillers tur i én kamp). */
export function turnsOf(darts: StatDart[]): TurnSummary[] {
  const map = new Map<string, TurnSummary>();
  for (const d of darts) {
    const key = `${d.matchId}|${d.userId}|${d.round}`;
    let t = map.get(key);
    if (!t) {
      t = { matchId: d.matchId, userId: d.userId, round: d.round, darts: 0, hits: 0, createdAt: d.createdAt };
      map.set(key, t);
    }
    t.darts++;
    if (isHit(d)) t.hits++;
    if (d.createdAt < t.createdAt) t.createdAt = d.createdAt;
  }
  return [...map.values()];
}

/** Seire og ferdige kamper for en bruker. Seier på lag teller for alle på laget. */
export function matchRecord(userId: string, matches: StatMatch[]) {
  let played = 0;
  let wins = 0;
  for (const m of matches) {
    if (!m.finished) continue;
    const me = m.players.find((p) => p.userId === userId);
    if (!me) continue;
    played++;
    if (m.winnerTeamId === me.teamId) wins++;
  }
  return { matches: played, wins, winRate: ratio(wins, played) };
}

export function playerStats(
  userId: string,
  allDarts: StatDart[],
  matches: StatMatch[],
  targets: readonly Field[],
  formLength = 10,
): PlayerStats {
  const darts = allDarts.filter((d) => d.userId === userId);
  const hits = darts.filter(isHit).length;

  const fields = targets.map((field) => ({ field, hits: darts.filter((d) => d.field === field).length }));
  const withHits = fields.filter((f) => f.hits > 0);
  const favoriteField = withHits.length ? withHits.reduce((a, b) => (b.hits > a.hits ? b : a)).field : null;
  const weakestField = withHits.length ? fields.reduce((a, b) => (b.hits < a.hits ? b : a)).field : null;

  const turns = turnsOf(darts);
  const full = turns.filter((t) => t.darts === 3);
  const bestTurn = turns.length
    ? turns.reduce((a, b) => (b.hits > a.hits || (b.hits === a.hits && b.createdAt < a.createdAt) ? b : a))
    : null;

  const byDartIndex = [0, 1, 2].map((index) => {
    const ds = darts.filter((d) => d.dartIndex === index);
    const h = ds.filter(isHit).length;
    return { index, darts: ds.length, hits: h, rate: ratio(h, ds.length) };
  });

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const perMatch = new Map<string, { darts: number; hits: number }>();
  for (const d of darts) {
    const s = perMatch.get(d.matchId) ?? { darts: 0, hits: 0 };
    s.darts++;
    if (isHit(d)) s.hits++;
    perMatch.set(d.matchId, s);
  }
  const form: FormPoint[] = [...perMatch.entries()]
    .map(([matchId, s]) => {
      const m = matchById.get(matchId);
      const me = m?.players.find((p) => p.userId === userId);
      return {
        matchId,
        date: m?.createdAt ?? new Date(0),
        darts: s.darts,
        hits: s.hits,
        mpr: ratio(s.hits, s.darts) * 3,
        won: m?.finished ? m.winnerTeamId === me?.teamId : null,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-formLength);

  return {
    userId,
    darts: darts.length,
    hits,
    hitRate: ratio(hits, darts.length),
    mpr: ratio(hits, darts.length) * 3,
    ...matchRecord(userId, matches),
    fields,
    favoriteField,
    weakestField,
    turns: turns.length,
    bestTurn,
    perfectTurns: full.filter((t) => t.hits === 3).length,
    blankTurns: full.filter((t) => t.hits === 0).length,
    byDartIndex,
    form,
  };
}

export interface GangRow {
  user: StatUser;
  darts: number;
  hits: number;
  hitRate: number;
  mpr: number;
  matches: number;
  wins: number;
  winRate: number;
}

/** Tabell over alle brukere som har kastet eller spilt, sortert på treff per runde. */
export function gangTable(users: StatUser[], darts: StatDart[], matches: StatMatch[]): GangRow[] {
  return users
    .map((user) => {
      const mine = darts.filter((d) => d.userId === user.id);
      const hits = mine.filter(isHit).length;
      return {
        user,
        darts: mine.length,
        hits,
        hitRate: ratio(hits, mine.length),
        mpr: ratio(hits, mine.length) * 3,
        ...matchRecord(user.id, matches),
      };
    })
    .filter((r) => r.darts > 0 || r.matches > 0)
    .sort((a, b) => b.mpr - a.mpr || b.winRate - a.winRate || a.user.name.localeCompare(b.user.name, "nb"));
}

export interface HeadToHead {
  opponent: StatUser;
  wins: number;
  losses: number;
}

/** Innbyrdes oppgjør: ferdige kamper der brukeren og motstanderen var på hvert sitt lag. */
export function headToHead(userId: string, users: StatUser[], matches: StatMatch[]): HeadToHead[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = new Map<string, HeadToHead>();
  for (const m of matches) {
    if (!m.finished || !m.winnerTeamId) continue;
    const me = m.players.find((p) => p.userId === userId);
    if (!me) continue;
    for (const p of m.players) {
      if (p.userId === userId || p.teamId === me.teamId) continue;
      const opponent = byId.get(p.userId);
      if (!opponent) continue;
      const row = rows.get(p.userId) ?? { opponent, wins: 0, losses: 0 };
      if (m.winnerTeamId === me.teamId) row.wins++;
      else if (m.winnerTeamId === p.teamId) row.losses++;
      rows.set(p.userId, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.wins + b.losses - (a.wins + a.losses) || a.opponent.name.localeCompare(b.opponent.name, "nb"));
}

/**
 * Spillekveld: datoen i Oslo-tid, forskjøvet 6 timer så kast etter midnatt
 * hører til kvelden før.
 */
export function eveningKey(d: Date): string {
  const shifted = new Date(d.getTime() - 6 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(shifted);
}

export interface EveningBest {
  evening: string;
  rows: { user: StatUser; darts: number; hits: number; mpr: number }[];
}

/** Siste spillekveld og hvem som hadde best treff per runde da (minst 9 piler). */
export function latestEvening(users: StatUser[], darts: StatDart[], minDarts = 9): EveningBest | null {
  if (darts.length === 0) return null;
  const evening = darts.map((d) => eveningKey(d.createdAt)).sort().at(-1)!;
  const tonight = darts.filter((d) => eveningKey(d.createdAt) === evening);
  const rows = users
    .map((user) => {
      const mine = tonight.filter((d) => d.userId === user.id);
      const hits = mine.filter(isHit).length;
      return { user, darts: mine.length, hits, mpr: ratio(hits, mine.length) * 3 };
    })
    .filter((r) => r.darts >= minDarts)
    .sort((a, b) => b.mpr - a.mpr);
  return { evening, rows };
}

export interface Title {
  key: string;
  emoji: string;
  title: string;
  description: string;
  user: StatUser;
  value: string;
}

function std(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
}

/** Morsomme titler. En tittel vises bare når noen faktisk kvalifiserer. */
export function titles(users: StatUser[], darts: StatDart[], matches: StatMatch[], bullField: Field): Title[] {
  const stats = users.map((user) => {
    const mine = darts.filter((d) => d.userId === user.id);
    const full = turnsOf(mine).filter((t) => t.darts === 3);
    const perMatch = new Map<string, { darts: number; hits: number }>();
    for (const d of mine) {
      const s = perMatch.get(d.matchId) ?? { darts: 0, hits: 0 };
      s.darts++;
      if (isHit(d)) s.hits++;
      perMatch.set(d.matchId, s);
    }
    const mprs = [...perMatch.values()].filter((s) => s.darts >= 9).map((s) => (s.hits / s.darts) * 3);
    return {
      user,
      perfect: full.filter((t) => t.hits === 3).length,
      blank: full.filter((t) => t.hits === 0).length,
      bull: mine.filter((d) => d.field === bullField).length,
      stability: mprs.length >= 3 ? std(mprs) : null,
      ...matchRecord(user.id, matches),
    };
  });

  const out: Title[] = [];
  const best = <T,>(list: T[], score: (t: T) => number | null, lowest = false) => {
    let pick: T | null = null;
    let pickScore = 0;
    for (const t of list) {
      const s = score(t);
      if (s === null) continue;
      if (pick === null || (lowest ? s < pickScore : s > pickScore)) {
        pick = t;
        pickScore = s;
      }
    }
    return pick ? { pick, score: pickScore } : null;
  };

  const machine = best(stats, (s) => (s.perfect > 0 ? s.perfect : null));
  if (machine)
    out.push({
      key: "maskinen",
      emoji: "🔥",
      title: "Maskinen",
      description: "Flest perfekte runder (3 av 3)",
      user: machine.pick.user,
      value: `${machine.score} perfekte`,
    });

  const bull = best(stats, (s) => (s.bull > 0 ? s.bull : null));
  if (bull)
    out.push({ key: "bull", emoji: "🐂", title: "Bull-magneten", description: "Flest treff på Bull", user: bull.pick.user, value: `${bull.score} på Bull` });

  const winner = best(stats, (s) => (s.matches >= 3 ? s.winRate : null));
  if (winner)
    out.push({
      key: "vinner",
      emoji: "🏆",
      title: "Vinnerskallen",
      description: "Høyest seiersandel (minst 3 kamper)",
      user: winner.pick.user,
      value: `${Math.round(winner.score * 100)} % seire`,
    });

  const stable = best(stats, (s) => s.stability, true);
  if (stable)
    out.push({
      key: "stabil",
      emoji: "📏",
      title: "Mr. Stabil",
      description: "Jevnest form fra kamp til kamp (minst 3 kamper)",
      user: stable.pick.user,
      value: `±${stable.score.toFixed(2)} treff per runde`,
    });

  const blank = best(stats, (s) => (s.blank > 0 ? s.blank : null));
  if (blank)
    out.push({
      key: "bom",
      emoji: "🙈",
      title: "Bom-kongen",
      description: "Flest runder med tre bom",
      user: blank.pick.user,
      value: `${blank.score} runder uten treff`,
    });

  return out;
}
