import { describe, expect, it } from "vitest";
import { formatDart, replay, roundsSummary, undoLast } from "../core/engine";
import { ANY_DOUBLE, ANY_TRIPLE, BULL, GameRuleError, MISS, type Dart, type MatchSetup, type Multiplier } from "../core/types";
import { closedCount, fieldStatusFor, isShut, MICKEY_TARGETS, mickeyMouse, type MickeyState } from "./rules";

const d = (field: number, multiplier: Multiplier = 1): Dart => ({ field, multiplier });
const miss = d(MISS);

function setup(teamCount: number, playersPerTeam = 1): MatchSetup {
  return {
    teams: Array.from({ length: teamCount }, (_, t) => ({
      id: `t${t}`,
      name: `Lag ${t + 1}`,
      players: Array.from({ length: playersPerTeam }, (_, p) => ({ id: `t${t}p${p}`, name: `Spiller ${t + 1}.${p + 1}` })),
    })),
  };
}

function play(s: MatchSetup, darts: Dart[]): MickeyState {
  return replay(mickeyMouse, s, darts);
}

/** Lager kast slik at hvert lag kaster sine tre piler etter tur. turns[i] = pilene til tur i. */
function turns(...list: Dart[][]): Dart[] {
  return list.flatMap((t) => [...t, ...Array(3 - t.length).fill(miss)]);
}

/** Ti turer med tre treff på hvert felt lukker alt. */
const closeAllTurns: Dart[][] = MICKEY_TARGETS.map((f) => [d(f), d(f), d(f)]);

/** Lag `team` lukker alt, de andre lagene bommer. Returnerer kastene til og med vinnerpila. */
function teamClosesAll(teamCount: number, team: number): Dart[] {
  const all = turns(...closeAllTurns.flatMap((t) => Array.from({ length: teamCount }, (_, i) => (i === team ? t : []))));
  // Kutt etter siste treff (vinnerpila)
  let last = -1;
  all.forEach((dart, i) => {
    if (dart.field !== MISS) last = i;
  });
  return all.slice(0, last + 1);
}

describe("lukking", () => {
  it("tre treff lukker et felt", () => {
    const s = play(setup(2), [d(20), d(20), d(20)]);
    expect(s.teams[0].marks[20]).toBe(3);
    expect(fieldStatusFor(s, 0, 20)).toBe("lukket");
    expect(fieldStatusFor(s, 1, 20)).toBe("aapen");
  });

  it("lukker over flere runder", () => {
    const s = play(setup(2), turns([d(19), d(19)], [], [d(19)]));
    expect(s.teams[0].marks[19]).toBe(3);
  });

  it("Bull lukkes med tre treff", () => {
    const s = play(setup(2), [d(BULL), d(BULL), d(BULL)]);
    expect(fieldStatusFor(s, 0, BULL)).toBe("lukket");
  });

  it("treff på et lukket felt teller ikke", () => {
    const s = play(setup(2), turns([d(20), d(20), d(20)], [], [d(20)]));
    expect(s.teams[0].marks[20]).toBe(3);
    expect(s.log.at(-1)?.marks).toBe(0);
  });

  it("bom med multiplikator avvises", () => {
    expect(() => play(setup(2), [d(MISS, 2)])).toThrow(GameRuleError);
  });

  it("teller lukkede felt", () => {
    // Lag 1 lukker 20, lag 2 bommer, lag 1 lukker 19
    const s = play(setup(2), [d(20), d(20), d(20), ...turns([], [d(19), d(19), d(19)])]);
    expect(closedCount(s.teams[0])).toBe(2);
    expect(closedCount(s.teams[1])).toBe(0);
  });
});

describe("felt", () => {
  it("feltene er 20–15, Dobbel, Trippel og Bull", () => {
    expect(MICKEY_TARGETS).toEqual([20, 19, 18, 17, 16, 15, ANY_DOUBLE, ANY_TRIPLE, BULL]);
  });

  it("Dobbel og Trippel lukkes med tre treff hver", () => {
    const s = play(setup(2), [d(ANY_DOUBLE), d(ANY_DOUBLE), d(ANY_DOUBLE), ...turns([], [d(ANY_TRIPLE), d(ANY_TRIPLE)])]);
    expect(fieldStatusFor(s, 0, ANY_DOUBLE)).toBe("lukket");
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(2);
  });

  it("single på 14–12 teller ikke", () => {
    expect(() => play(setup(2), [d(14)])).toThrow(GameRuleError);
    expect(() => play(setup(2), [d(12)])).toThrow(GameRuleError);
  });
});

describe("stengte felt", () => {
  it("felt er stengt når alle lag har lukket", () => {
    const s = play(setup(2), turns([d(20), d(20), d(20)], [d(20), d(20), d(20)]));
    expect(isShut(s, 20)).toBe(true);
    expect(fieldStatusFor(s, 0, 20)).toBe("stengt");
  });

  it("med 4 lag er feltet ikke stengt før alle fire har lukket", () => {
    const three = [d(15), d(15), d(15)];
    const s = play(setup(4), turns(three, three, three, []));
    expect(isShut(s, 15)).toBe(false);
    expect(fieldStatusFor(s, 3, 15)).toBe("aapen");
    expect(isShut(play(setup(4), turns(three, three, three, three)), 15)).toBe(true);
  });
});

describe("tur og rotasjon", () => {
  it("tre piler per lag, så neste lag, så ny runde", () => {
    expect(play(setup(2), [miss, miss, miss]).turn).toMatchObject({ round: 0, teamIndex: 1, dartIndex: 0 });
    expect(play(setup(2), Array(6).fill(miss)).turn).toMatchObject({ round: 1, teamIndex: 0, dartIndex: 0 });
  });

  it("spillerrekkefølgen innen laget roterer hver runde", () => {
    const st = setup(2, 2);
    expect(play(st, []).turn.playerId).toBe("t0p0");
    expect(play(st, Array(3).fill(miss)).turn.playerId).toBe("t1p0");
    expect(play(st, Array(6).fill(miss)).turn.playerId).toBe("t0p1");
    expect(play(st, Array(12).fill(miss)).turn.playerId).toBe("t0p0");
  });

  it("lag med ulikt antall spillere roterer hver for seg", () => {
    const st: MatchSetup = {
      teams: [
        { id: "a", name: "A", players: [{ id: "a1", name: "a1" }] },
        { id: "b", name: "B", players: [{ id: "b1", name: "b1" }, { id: "b2", name: "b2" }, { id: "b3", name: "b3" }] },
      ],
    };
    const players = [0, 1, 2, 3].map((r) => play(st, Array(r * 6 + 3).fill(miss)).turn.playerId);
    expect(players).toEqual(["b1", "b2", "b3", "b1"]);
  });
});

describe("angre", () => {
  it("angre siste kast gir samme state som før kastet", () => {
    const darts = turns([d(20), d(19)], [d(20)], [d(20), d(19)]);
    expect(undoLast(mickeyMouse, setup(2), darts)).toEqual(play(setup(2), darts.slice(0, -1)));
  });

  it("angre kan gjentas helt tilbake til start", () => {
    let darts = turns([d(20), d(20)], [d(18)]);
    while (darts.length > 0) darts = darts.slice(0, -1);
    expect(play(setup(2), darts)).toEqual(mickeyMouse.init(setup(2)));
  });

  it("angre gjenåpner et lukket felt", () => {
    const s = undoLast(mickeyMouse, setup(2), [d(20), d(20), d(20)]);
    expect(s.teams[0].marks[20]).toBe(2);
    expect(fieldStatusFor(s, 0, 20)).toBe("aapen");
  });

  it("angre av vinnerkastet gjenåpner kampen", () => {
    const darts = teamClosesAll(2, 0);
    expect(play(setup(2), darts).finished).toBe(true);
    const undone = undoLast(mickeyMouse, setup(2), darts);
    expect(undone.finished).toBe(false);
    expect(undone.winnerTeamIndex).toBeNull();
    expect(undone.turn).toMatchObject({ teamIndex: 0, dartIndex: 2 });
  });

  it("angre av siste pil i en runde flytter turen tilbake", () => {
    expect(undoLast(mickeyMouse, setup(2), [miss, miss, miss]).turn).toMatchObject({ round: 0, teamIndex: 0, dartIndex: 2 });
  });
});

describe("vinnerbestemmelse", () => {
  it("2 lag: første lag som lukker alt vinner med en gang", () => {
    const s = play(setup(2), teamClosesAll(2, 0));
    expect(s.finished).toBe(true);
    expect(s.winnerTeamIndex).toBe(0);
    expect(() => mickeyMouse.apply(s, miss)).toThrow("Kampen er ferdig");
  });

  it("2 lag: ni lukkede felt er ikke nok", () => {
    const s = play(setup(2), teamClosesAll(2, 0).slice(0, -1));
    expect(closedCount(s.teams[0])).toBe(MICKEY_TARGETS.length - 1);
    expect(s.finished).toBe(false);
  });

  it("2 lag: andre lag kan vinne", () => {
    const s = play(setup(2), teamClosesAll(2, 1));
    expect(s.winnerTeamIndex).toBe(1);
  });

  it("3 lag: laget som lukker alt først vinner, selv om et annet lag er nær", () => {
    // Lag 1 og lag 3 lukker felt i samme takt, men lag 1 kaster først hver runde
    const darts = turns(...closeAllTurns.flatMap((t) => [t, [], t]));
    // Stopp etter lag 1 sin siste tur (n-1 hele runder à 9 piler + 3)
    const n = MICKEY_TARGETS.length;
    const s = play(setup(3), darts.slice(0, (n - 1) * 9 + 3));
    expect(s.winnerTeamIndex).toBe(0);
    expect(closedCount(s.teams[2])).toBe(n - 1);
  });

  it("3 lag: midterste lag kan vinne", () => {
    expect(play(setup(3), teamClosesAll(3, 1)).winnerTeamIndex).toBe(1);
  });

  it("4 lag: siste lag i rekkefølgen kan vinne", () => {
    const s = play(setup(4), teamClosesAll(4, 3));
    expect(s.finished).toBe(true);
    expect(s.winnerTeamIndex).toBe(3);
  });

  it("4 lag: ingen vinner før noen har lukket alt", () => {
    const three = (f: number) => [d(f), d(f), d(f)];
    const s = play(setup(4), turns(three(20), three(19), three(18), three(17)));
    expect(s.finished).toBe(false);
    expect(s.teams.map(closedCount)).toEqual([1, 1, 1, 1]);
  });
});

describe("hjelpere", () => {
  it("runde-for-runde-oversikt summerer treff per lag", () => {
    const rounds = roundsSummary(play(setup(2), turns([d(20), d(20), d(19)], [d(19)])));
    expect(rounds).toHaveLength(1);
    expect(rounds[0][0]).toMatchObject({ teamIndex: 0, marks: 3, points: 0 });
    expect(rounds[0][1]).toMatchObject({ teamIndex: 1, marks: 1, points: 0 });
  });

  it("formaterer kast", () => {
    expect(formatDart(d(20, 3))).toBe("T20");
    expect(formatDart(d(19, 2))).toBe("D19");
    expect(formatDart(d(BULL))).toBe("Bull");
    expect(formatDart(miss)).toBe("Bom");
    expect(formatDart(d(ANY_DOUBLE))).toBe("Dobbel");
    expect(formatDart(d(ANY_TRIPLE))).toBe("Trippel");
  });
});

describe("tallverdi: dobbel og trippel", () => {
  it("T19 kan deles: 2 på 19 og 1 på Trippel", () => {
    const s = play(setup(2), [{ field: 19, multiplier: 3, ring: true, numberMarks: 2 }]);
    expect(s.teams[0].marks[19]).toBe(2);
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(1);
    expect(s.log[0].marks).toBe(3);
  });

  it("D19 kan deles: 1 på 19 og 1 på Dobbel", () => {
    const s = play(setup(2), [{ field: 19, multiplier: 2, ring: true, numberMarks: 1 }]);
    expect(s.teams[0].marks[19]).toBe(1);
    expect(s.teams[0].marks[ANY_DOUBLE]).toBe(1);
  });

  it("delt kast: treff over tre på tallet forsvinner, ringen teller likevel", () => {
    const s = play(setup(2), [d(19), d(19), { field: 19, multiplier: 3, ring: true, numberMarks: 2 }]);
    expect(s.teams[0].marks[19]).toBe(3);
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(1);
    expect(s.log[2].marks).toBe(2);
  });

  it("ugyldig fordeling avvises", () => {
    expect(() => play(setup(2), [{ field: 19, multiplier: 3, ring: true, numberMarks: 3 }])).toThrow(GameRuleError);
    expect(() => play(setup(2), [{ field: 19, multiplier: 2, ring: true, numberMarks: 2 }])).toThrow(GameRuleError);
    expect(() => play(setup(2), [{ field: 19, multiplier: 3, numberMarks: 2 }])).toThrow(GameRuleError);
  });

  it("formaterer delt kast", () => {
    expect(formatDart({ field: 19, multiplier: 3, ring: true, numberMarks: 2 })).toBe("T19 → 2×19 + Trippel");
  });

  it("T20 teller 3 treff på 20 og lukker feltet i ett kast", () => {
    const s = play(setup(2), [d(20, 3)]);
    expect(s.teams[0].marks[20]).toBe(3);
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(0);
    expect(s.log[0].marks).toBe(3);
    expect(fieldStatusFor(s, 0, 20)).toBe("lukket");
    expect(s.turn).toMatchObject({ dartIndex: 1 }); // to piler igjen
  });

  it("T20 med ring-valg teller 1 treff på Trippel og ingenting på 20", () => {
    const s = play(setup(2), [{ field: 20, multiplier: 3, ring: true }]);
    expect(s.teams[0].marks[20]).toBe(0);
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(1);
    expect(s.log[0].marks).toBe(1);
  });

  it("D19 teller 2 treff på 19, eller 1 på Dobbel med ring-valg", () => {
    expect(play(setup(2), [d(19, 2)]).teams[0].marks[19]).toBe(2);
    const ring = play(setup(2), [{ field: 19, multiplier: 2, ring: true }]);
    expect(ring.teams[0].marks[19]).toBe(0);
    expect(ring.teams[0].marks[ANY_DOUBLE]).toBe(1);
  });

  it("T7 og D3 teller bare på Trippel/Dobbel (ett treff), uten ring-valg", () => {
    const s = play(setup(2), [d(7, 3), d(3, 2)]);
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(1);
    expect(s.teams[0].marks[ANY_DOUBLE]).toBe(1);
    expect(s.log.map((l) => l.marks)).toEqual([1, 1]);
  });

  it("treff utover 3 forsvinner", () => {
    const s = play(setup(2), [d(20), d(20, 3)]);
    expect(s.teams[0].marks[20]).toBe(3);
    expect(s.log[1].marks).toBe(2);
    // et lukket felt gir ingenting
    expect(play(setup(2), [d(20, 3), d(20, 3)]).log[1].marks).toBe(0);
  });

  it("Bull gir 1 treff, Bullseye 2 treff, og Bullseye er ikke en Dobbel", () => {
    const s = play(setup(2), [d(BULL), d(BULL, 2)]);
    expect(s.teams[0].marks[BULL]).toBe(3);
    expect(s.teams[0].marks[ANY_DOUBLE]).toBe(0);
    expect(s.log.map((l) => l.marks)).toEqual([1, 2]);
    expect(() => play(setup(2), [d(BULL, 3)])).toThrow(GameRuleError);
  });

  it("single på 1–14 er bom og avvises, det samme er ukjente felt og ring-valg på single", () => {
    expect(() => play(setup(2), [d(14)])).toThrow(GameRuleError);
    expect(() => play(setup(2), [d(1)])).toThrow(GameRuleError);
    expect(() => play(setup(2), [d(21)])).toThrow(GameRuleError);
    expect(() => play(setup(2), [{ field: 20, multiplier: 1, ring: true }])).toThrow(GameRuleError);
    expect(() => play(setup(2), [{ field: 0, multiplier: 1, ring: true }])).toThrow(GameRuleError);
  });

  it("gamle kast med feltkode 102/103 virker som før", () => {
    const s = play(setup(2), [d(ANY_DOUBLE), d(ANY_TRIPLE), d(ANY_TRIPLE)]);
    expect(s.teams[0].marks[ANY_DOUBLE]).toBe(1);
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(2);
    expect(() => play(setup(2), [d(ANY_DOUBLE, 2)])).toThrow(GameRuleError);
  });

  it("Linns eksempel: T20 lukker 20, og trippel-ringen får ett treff med neste pil på Trippel", () => {
    const s = play(setup(2), [d(20, 3), { field: 5, multiplier: 3 }, miss]);
    expect(fieldStatusFor(s, 0, 20)).toBe("lukket");
    expect(s.teams[0].marks[ANY_TRIPLE]).toBe(1);
  });

  it("vinnerkastet kan være en trippel", () => {
    const rest = MICKEY_TARGETS.filter((f) => f !== 20);
    const darts = [...turns(...rest.map((f) => [d(f), d(f), d(f)]).flatMap((t) => [t, []])), d(20, 3)];
    const s = play(setup(2), darts);
    expect(s.finished).toBe(true);
    expect(s.winnerTeamIndex).toBe(0);
  });

  it("angre av en trippel gjenåpner feltet", () => {
    const s = undoLast(mickeyMouse, setup(2), [d(20, 3)]);
    expect(s.teams[0].marks[20]).toBe(0);
  });

  it("formaterer kast med ring og Bullseye", () => {
    expect(formatDart({ field: 20, multiplier: 3, ring: true })).toBe("T20 → Trippel");
    expect(formatDart({ field: 19, multiplier: 2, ring: true })).toBe("D19 → Dobbel");
    expect(formatDart(d(BULL, 2))).toBe("Bullseye");
    expect(formatDart(d(7, 3))).toBe("T7");
  });

  it("runde-for-runde teller merker, og ring-valget følger med", () => {
    const rounds = roundsSummary(play(setup(2), [d(20, 3), { field: 19, multiplier: 2, ring: true }, miss]));
    expect(rounds[0][0].marks).toBe(4);
    expect(rounds[0][0].darts[1]).toEqual({ field: 19, multiplier: 2, ring: true });
  });
});
