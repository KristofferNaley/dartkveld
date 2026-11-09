import { describe, expect, it } from "vitest";
import { ANY_DOUBLE, ANY_TRIPLE, BULL, MISS } from "@/games/core/types";
import { MICKEY_TARGETS } from "@/games/mickey-mouse/rules";
import {
  eveningKey,
  gangTable,
  headToHead,
  latestEvening,
  matchRecord,
  playerStats,
  titles,
  turnsOf,
  type StatDart,
  type StatMatch,
  type StatUser,
} from "./compute";

const users: StatUser[] = [
  { id: "ola", name: "Ola" },
  { id: "kari", name: "Kari" },
  { id: "per", name: "Per" },
];

const t0 = new Date("2026-11-07T19:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);

/** Lag kast for én runde. fields: tre felt (0 = bom). */
function turn(matchId: string, userId: string, round: number, fields: number[], minute = round): StatDart[] {
  return fields.map((field, dartIndex) => ({ matchId, userId, round, dartIndex, field, createdAt: at(minute) }));
}

const matches: StatMatch[] = [
  // m1: Ola mot Kari, Ola vinner
  { id: "m1", finished: true, createdAt: at(0), winnerTeamId: "m1a", players: [{ userId: "ola", teamId: "m1a" }, { userId: "kari", teamId: "m1b" }] },
  // m2: Ola og Per på lag mot Kari, Kari vinner
  {
    id: "m2",
    finished: true,
    createdAt: at(60),
    winnerTeamId: "m2b",
    players: [
      { userId: "ola", teamId: "m2a" },
      { userId: "per", teamId: "m2a" },
      { userId: "kari", teamId: "m2b" },
    ],
  },
  // m3: pågår
  { id: "m3", finished: false, createdAt: at(120), winnerTeamId: null, players: [{ userId: "ola", teamId: "m3a" }, { userId: "kari", teamId: "m3b" }] },
];

const darts: StatDart[] = [
  ...turn("m1", "ola", 0, [20, 20, 20]),
  ...turn("m1", "kari", 0, [MISS, MISS, MISS]),
  ...turn("m1", "ola", 1, [19, MISS, BULL]),
  ...turn("m1", "kari", 1, [18, MISS, MISS]),
  ...turn("m2", "ola", 0, [MISS, MISS, 20], 60),
  ...turn("m2", "kari", 0, [BULL, BULL, ANY_DOUBLE], 60),
  ...turn("m2", "per", 1, [MISS, MISS, MISS], 61),
  ...turn("m3", "ola", 0, [17], 120), // pågående runde med én pil
];

describe("runder", () => {
  it("grupperer kast per spiller, kamp og runde", () => {
    const turns = turnsOf(darts.filter((d) => d.userId === "ola"));
    expect(turns).toHaveLength(4);
    expect(turns.find((t) => t.matchId === "m1" && t.round === 0)).toMatchObject({ darts: 3, hits: 3 });
  });
});

describe("spillerstatistikk", () => {
  const ola = playerStats("ola", darts, matches, MICKEY_TARGETS);

  it("treff, treffprosent og treff per runde", () => {
    expect(ola.darts).toBe(10);
    expect(ola.hits).toBe(7);
    expect(ola.hitRate).toBeCloseTo(0.7);
    expect(ola.mpr).toBeCloseTo(2.1);
  });

  it("kamper og seire teller bare ferdige kamper; lagseier teller for alle på laget", () => {
    expect(ola).toMatchObject({ matches: 2, wins: 1, winRate: 0.5 });
    expect(matchRecord("kari", matches)).toMatchObject({ matches: 2, wins: 1 });
    expect(matchRecord("per", matches)).toMatchObject({ matches: 1, wins: 0 });
  });

  it("treff per felt, favoritt og svakeste felt", () => {
    expect(ola.fields.find((f) => f.field === 20)?.hits).toBe(4);
    expect(ola.favoriteField).toBe(20);
    expect(ola.fields.map((f) => f.field)).toEqual([...MICKEY_TARGETS]);
    expect(ola.weakestField).toBe(18); // første felt med 0 treff i rekkefølgen
  });

  it("beste runde, perfekte runder og runder med tre bom", () => {
    expect(ola.bestTurn).toMatchObject({ matchId: "m1", round: 0, hits: 3 });
    expect(ola.perfectTurns).toBe(1);
    expect(ola.blankTurns).toBe(0);
    expect(ola.turns).toBe(4);
    expect(playerStats("per", darts, matches, MICKEY_TARGETS).blankTurns).toBe(1);
  });

  it("en ufullstendig runde teller ikke som perfekt eller blank", () => {
    const s = playerStats("ola", turn("m3", "ola", 0, [MISS]), matches, MICKEY_TARGETS);
    expect(s.blankTurns).toBe(0);
  });

  it("treffprosent per pilnummer", () => {
    expect(ola.byDartIndex.map((b) => b.hits)).toEqual([3, 1, 3]);
    expect(ola.byDartIndex[2].rate).toBeCloseTo(1);
  });

  it("form per kamp i kronologisk rekkefølge, med utfall", () => {
    expect(ola.form.map((f) => f.matchId)).toEqual(["m1", "m2", "m3"]);
    expect(ola.form.map((f) => f.won)).toEqual([true, false, null]);
    expect(ola.form[0].mpr).toBeCloseTo(2.5);
  });

  it("bruker uten kast får nuller, ikke NaN", () => {
    const s = playerStats("ingen", darts, matches, MICKEY_TARGETS);
    expect(s).toMatchObject({ darts: 0, hitRate: 0, mpr: 0, favoriteField: null, bestTurn: null });
  });
});

describe("gjengen", () => {
  it("tabellen er sortert på treff per runde", () => {
    const rows = gangTable(users, darts, matches);
    expect(rows.map((r) => r.user.id)).toEqual(["ola", "kari", "per"]);
    expect(rows[1]).toMatchObject({ darts: 9, hits: 4, matches: 2, wins: 1 });
  });

  it("brukere uten kast og kamper er ikke med", () => {
    expect(gangTable([...users, { id: "ny", name: "Ny" }], darts, matches)).toHaveLength(3);
  });

  it("innbyrdes oppgjør teller bare motstandere på andre lag i ferdige kamper", () => {
    const h = headToHead("ola", users, matches);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ opponent: { id: "kari" }, wins: 1, losses: 1 });
    expect(headToHead("per", users, matches)).toEqual([{ opponent: users[1], wins: 0, losses: 1 }]);
  });

  it("spillekvelden flyttes 6 timer, så kast etter midnatt hører til kvelden før", () => {
    expect(eveningKey(new Date("2026-11-07T20:00:00Z"))).toBe("2026-11-07");
    expect(eveningKey(new Date("2026-11-07T23:30:00Z"))).toBe("2026-11-07"); // 00:30 i Oslo
    expect(eveningKey(new Date("2026-11-08T10:00:00Z"))).toBe("2026-11-08");
  });

  it("kveldens beste krever minst 9 piler", () => {
    const e = latestEvening(users, darts, 9);
    expect(e?.evening).toBe("2026-11-07");
    expect(e?.rows.map((r) => r.user.id)).toEqual(["ola", "kari"]);
    expect(latestEvening(users, [])).toBeNull();
  });

  it("titler deles bare ut når noen kvalifiserer", () => {
    const t = titles(users, darts, matches, BULL);
    const byKey = Object.fromEntries(t.map((x) => [x.key, x.user.id]));
    expect(byKey.maskinen).toBe("ola");
    expect(byKey.bull).toBe("kari");
    expect(byKey.bom).toBe("kari"); // Kari og Per har 1 hver; første i listen vinner ved likhet
    expect(byKey.vinner).toBeUndefined(); // ingen har 3 kamper
    expect(byKey.stabil).toBeUndefined();
  });
});

describe("merker og tallverdi", () => {
  const dart = (field: number, multiplier: 1 | 2 | 3, ring = false, dartIndex = 0): StatDart => ({
    matchId: "m1", userId: "ola", round: 0, dartIndex, field, multiplier, ring, createdAt: at(0),
  });

  it("merker per runde teller trippel som 3, dobbel som 2 og Bullseye som 2", () => {
    const s = playerStats("ola", [dart(20, 3), dart(19, 2, false, 1), dart(BULL, 2, false, 2)], matches, MICKEY_TARGETS);
    expect(s.marks).toBe(7);
    expect(s.hits).toBe(3);
    expect(s.mpr).toBeCloseTo(7);
  });

  it("ring-valg gir 1 merke, og T7 gir 1 merke", () => {
    const s = playerStats("ola", [dart(20, 3, true), dart(7, 3, false, 1), dart(14, 1, false, 2)], matches, MICKEY_TARGETS);
    expect(s.marks).toBe(2);
    expect(s.hits).toBe(2); // singlen på 14 er bom
  });

  it("favorittfelt telles på faktisk tall, uansett ring", () => {
    const s = playerStats("ola", [dart(20, 3, true), dart(20, 2, false, 1), dart(19, 1, false, 2)], matches, MICKEY_TARGETS);
    expect(s.fields.find((f) => f.field === 20)?.hits).toBe(2);
    expect(s.fields.find((f) => f.field === ANY_TRIPLE)?.hits).toBe(1);
    expect(s.fields.find((f) => f.field === ANY_DOUBLE)?.hits).toBe(1);
    expect(s.favoriteField).toBe(20);
  });

  it("beste runde rangeres etter merker", () => {
    const s = playerStats("ola", [dart(20, 3), dart(20, 3, false, 1), dart(MISS, 1, false, 2), ...turn("m2", "ola", 0, [20, 20, 20], 60)], matches, MICKEY_TARGETS);
    expect(s.bestTurn).toMatchObject({ matchId: "m1", marks: 6 });
  });

  it("eldre kast uten ring og multiplikator teller som før", () => {
    expect(playerStats("ola", turn("m1", "ola", 0, [20, ANY_DOUBLE, 0]), matches, MICKEY_TARGETS)).toMatchObject({ marks: 2, hits: 2 });
  });
});
