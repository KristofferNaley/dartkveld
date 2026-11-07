import { describe, expect, it } from "vitest";
import { formatDart, replay, roundsSummary, undoLast } from "../core/engine";
import { BULL, GameRuleError, MISS, type Dart, type MatchSetup, type Multiplier } from "../core/types";
import { determineWinner, fieldStatusFor, isShut, MICKEY_TARGETS, mickeyMouse, type MickeyState } from "./rules";

const d = (field: number, multiplier: Multiplier = 1): Dart => ({ field, multiplier });
const miss = d(MISS);
const T = (f: number) => d(f, 3);

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

/** Tre triple-runder som lukker felt i rekkefølge: 9 felt med triple, Bull med D+S. */
const closeAllTurns: Dart[][] = [
  [T(20), T(19), T(18)],
  [T(17), T(16), T(15)],
  [T(14), T(13), T(12)],
  [d(BULL, 2), d(BULL, 1)],
];

describe("lukking", () => {
  it("single, double og triple gir 1, 2 og 3 treff", () => {
    const s = play(setup(2), [d(20), d(19, 2), T(18)]);
    expect(s.teams[0].marks[20]).toBe(1);
    expect(s.teams[0].marks[19]).toBe(2);
    expect(s.teams[0].marks[18]).toBe(3);
    expect(fieldStatusFor(s, 0, 18)).toBe("lukket");
    expect(fieldStatusFor(s, 0, 20)).toBe("aapen");
  });

  it("lukker med tre singler over flere runder", () => {
    const s = play(setup(2), turns([d(20), d(20)], [], [d(20)]));
    expect(s.teams[0].marks[20]).toBe(3);
    expect(s.teams[0].score).toBe(0);
  });

  it("Bull: single teller 1, double teller 2, triple er ulovlig", () => {
    const s = play(setup(2), [d(BULL), d(BULL, 2)]);
    expect(s.teams[0].marks[BULL]).toBe(3);
    expect(() => play(setup(2), [d(BULL, 3)])).toThrow(GameRuleError);
  });

  it("felt utenfor spillet og bom med multiplikator avvises", () => {
    expect(() => play(setup(2), [d(11)])).toThrow(GameRuleError);
    expect(() => play(setup(2), [d(MISS, 2)])).toThrow(GameRuleError);
  });

  it("treff teller ikke over 3 i marks", () => {
    const s = play(setup(2), [T(20), T(20)]);
    expect(s.teams[0].marks[20]).toBe(3);
  });
});

describe("poengscoring", () => {
  it("overskytende treff gir poeng når motstanderen ikke har lukket", () => {
    const s = play(setup(2), [T(20), T(20), d(20, 2)]);
    expect(s.teams[0].score).toBe(100);
  });

  it("overskudd i samme pil som lukker gir poeng", () => {
    const s = play(setup(2), [d(19, 2), T(19)]);
    expect(s.teams[0].marks[19]).toBe(3);
    expect(s.teams[0].score).toBe(2 * 19);
  });

  it("Bull gir 25 per overskytende treff", () => {
    const s = play(setup(2), [d(BULL, 2), d(BULL, 2), d(BULL)]);
    expect(s.teams[0].score).toBe(25 + 25);
  });

  it("loggen registrerer marks og poeng per kast", () => {
    const s = play(setup(2), [d(18, 2), T(18)]);
    expect(s.log[1]).toMatchObject({ marks: 1, points: 36, teamIndex: 0, round: 0, dartIndex: 1 });
  });

  it("med 3 lag scorer man så lenge minst én motstander er åpen", () => {
    const s = play(setup(3), turns([T(20)], [T(20)], [], [T(20)]));
    expect(s.teams[0].score).toBe(60);
  });
});

describe("stengte felt", () => {
  it("felt er stengt når alle lag har lukket, og gir ingen poeng", () => {
    const s = play(setup(2), turns([T(20)], [T(20)], [T(20), T(20)]));
    expect(isShut(s, 20)).toBe(true);
    expect(fieldStatusFor(s, 0, 20)).toBe("stengt");
    expect(fieldStatusFor(s, 1, 20)).toBe("stengt");
    expect(s.teams[0].score).toBe(0);
  });

  it("med 4 lag er feltet ikke stengt før alle fire har lukket", () => {
    const s = play(setup(4), turns([T(15)], [T(15)], [T(15)], []));
    expect(isShut(s, 15)).toBe(false);
    expect(fieldStatusFor(s, 3, 15)).toBe("aapen");
    const s2 = play(setup(4), turns([T(15)], [T(15)], [T(15)], [T(15)], [T(15)]));
    expect(isShut(s2, 15)).toBe(true);
    expect(s2.teams[0].score).toBe(0);
  });
});

describe("tur og rotasjon", () => {
  it("tre piler per lag, så neste lag, så ny runde", () => {
    const s = play(setup(2), [miss, miss, miss]);
    expect(s.turn).toMatchObject({ round: 0, teamIndex: 1, dartIndex: 0 });
    const s2 = play(setup(2), Array(6).fill(miss));
    expect(s2.turn).toMatchObject({ round: 1, teamIndex: 0, dartIndex: 0 });
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
    const darts = turns([T(20), d(19, 2)], [T(20)], [T(20), d(19)]);
    const before = play(setup(2), darts.slice(0, -1));
    expect(undoLast(mickeyMouse, setup(2), darts)).toEqual(before);
  });

  it("angre kan gjentas helt tilbake til start", () => {
    let darts = turns([T(20), T(20)], [d(18, 2)]);
    while (darts.length > 0) darts = darts.slice(0, -1);
    expect(play(setup(2), darts)).toEqual(mickeyMouse.init(setup(2)));
  });

  it("angre fjerner poeng og lukking", () => {
    const darts = [T(20), T(20)];
    const s = undoLast(mickeyMouse, setup(2), darts);
    expect(s.teams[0].score).toBe(0);
    expect(s.teams[0].marks[20]).toBe(3);
  });

  it("angre av vinnerkastet gjenåpner kampen", () => {
    const st = setup(2);
    const darts = turns(...closeAllTurns.flatMap((t) => [t, []])).slice(0, -4);
    const finished = play(st, darts);
    expect(finished.finished).toBe(true);
    const undone = undoLast(mickeyMouse, st, darts);
    expect(undone.finished).toBe(false);
    expect(undone.winnerTeamIndex).toBeNull();
    expect(undone.turn).toMatchObject({ teamIndex: 0, dartIndex: 1 });
  });

  it("angre av siste pil i en runde flytter turen tilbake", () => {
    const s = undoLast(mickeyMouse, setup(2), [miss, miss, miss]);
    expect(s.turn).toMatchObject({ round: 0, teamIndex: 0, dartIndex: 2 });
  });
});

describe("vinnerbestemmelse", () => {
  it("2 lag: laget som lukker alt med minst like mange poeng vinner", () => {
    const darts = turns(...closeAllTurns.flatMap((t) => [t, []]));
    const s = play(setup(2), darts.slice(0, -4));
    expect(s.finished).toBe(true);
    expect(s.winnerTeamIndex).toBe(0);
    expect(() => mickeyMouse.apply(s, miss)).toThrow("Kampen er ferdig");
  });

  it("2 lag: lukket alt men færre poeng gir ingen vinner ennå", () => {
    const st = setup(2);
    // Lag 2 scorer 60 på 20 først
    const darts = turns([], [T(20), T(20)], ...closeAllTurns.flatMap((t) => [t, []]));
    const s = play(st, darts);
    expect(MICKEY_TARGETS.every((f) => s.teams[0].marks[f] === 3)).toBe(true);
    expect(s.teams[0].score).toBe(0);
    expect(s.teams[1].score).toBe(60);
    expect(s.finished).toBe(false);
  });

  it("2 lag: laget tar igjen poengene og vinner så snart det leder eller er likt", () => {
    const st = setup(2);
    const before = turns([], [T(20), T(20)], ...closeAllTurns.flatMap((t) => [t, []]));
    // Lag 1 har lukket alt og kaster 19 (lag 2 har ikke lukket 19): 57 poeng, så 19 igjen
    const s1 = play(st, [...before, T(19)]);
    expect(s1.finished).toBe(false);
    expect(s1.teams[0].score).toBe(57);
    const s2 = play(st, [...before, T(19), d(19)]);
    expect(s2.teams[0].score).toBe(76);
    expect(s2.finished).toBe(true);
    expect(s2.winnerTeamIndex).toBe(0);
  });

  it("2 lag: likt antall poeng er nok for laget som lukker alt", () => {
    const darts = turns(
      [T(12), T(12)], // lag 1: lukker 12 og scorer 36
      [T(18), d(18, 2)], // lag 2: lukker 18 og scorer 36
      [T(20), T(19), T(18)],
      [],
      [T(17), T(16), T(15)],
      [],
      [T(14), T(13)],
      [],
      [d(BULL, 2), d(BULL)],
    ).slice(0, -1);
    const s = play(setup(2), darts);
    expect(s.teams[0].score).toBe(36);
    expect(s.teams[1].score).toBe(36);
    expect(s.finished).toBe(true);
    expect(s.winnerTeamIndex).toBe(0);
  });

  it("3 lag: første lag som har lukket alt og leder vinner", () => {
    const darts = turns(...closeAllTurns.flatMap((t) => [[], t, []]));
    const s = play(setup(3), darts.slice(0, darts.length - 3 - 1));
    expect(s.finished).toBe(true);
    expect(s.winnerTeamIndex).toBe(1);
  });

  it("3 lag: lukket alt men bak én motstander gir ikke seier", () => {
    const st = setup(3);
    // Lag 3 scorer 60 på 20 først, lag 1 lukker alt uten poeng
    const darts = turns([], [], [T(20), T(20)], ...closeAllTurns.flatMap((t) => [t, [], []]));
    const s = play(st, darts);
    expect(s.finished).toBe(false);
    expect(s.teams[0].closedAllAtSeq).not.toBeNull();
  });

  it("4 lag: vinneren er laget som først lukker alt med høyest poengsum", () => {
    const st = setup(4);
    const darts = turns(...closeAllTurns.flatMap((t) => [[], [], [], t]));
    const s = play(st, darts.slice(0, -1));
    expect(s.finished).toBe(true);
    expect(s.winnerTeamIndex).toBe(3);
    expect(s.teams[3].closedAllAtSeq).toBe(darts.length - 2);
  });

  it("4 lag: reserveregel når alle har lukket alt uten vinner", () => {
    // Konstruert state: alle har lukket alt, høyest poengsum vinner
    const st = setup(4);
    const s = mickeyMouse.init(st);
    const full = Object.fromEntries(MICKEY_TARGETS.map((f) => [f, 3])) as MickeyState["teams"][number]["marks"];
    const teams = [10, 40, 40, 5].map((score, i) => ({ marks: { ...full }, score, closedAllAtSeq: 100 - i }));
    const state: MickeyState = { ...s, teams };
    // Lag 3 (indeks 2) lukket alt før lag 2 (indeks 1) ifølge closedAllAtSeq
    expect(determineWinner(state, 0)).toBe(2);
  });
});

describe("hjelpere", () => {
  it("runde-for-runde-oversikt summerer per lag", () => {
    const s = play(setup(2), turns([T(20), T(20)], [d(19)]));
    const rounds = roundsSummary(s);
    expect(rounds).toHaveLength(1);
    expect(rounds[0][0]).toMatchObject({ teamIndex: 0, marks: 3, points: 60 });
    expect(rounds[0][1]).toMatchObject({ teamIndex: 1, marks: 1, points: 0 });
  });

  it("formaterer kast", () => {
    expect(formatDart(T(20))).toBe("T20");
    expect(formatDart(d(19, 2))).toBe("D19");
    expect(formatDart(d(BULL, 2))).toBe("Bullseye");
    expect(formatDart(miss)).toBe("Bom");
  });
});
