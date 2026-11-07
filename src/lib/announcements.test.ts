import { describe, expect, it } from "vitest";
import { replay } from "@/games/core/engine";
import { MISS, type Dart, type MatchSetup } from "@/games/core/types";
import { MICKEY_TARGETS, mickeyMouse } from "@/games/mickey-mouse/rules";
import { announcementSince, pickMessage, toneForTurn } from "./announcements";

const setup: MatchSetup = {
  teams: [
    { id: "a", name: "Lag A", players: [{ id: "a1", name: "Ola" }] },
    { id: "b", name: "Lag B", players: [{ id: "b1", name: "Kari" }] },
  ],
};
const d = (field: number): Dart => ({ field, multiplier: 1 });
const miss = d(MISS);
const names = (ti: number, pid: string) => ({ lag: setup.teams[ti].name, spiller: pid === "a1" ? "Ola" : "Kari" });
const play = (darts: Dart[]) => replay(mickeyMouse, setup, darts);
const announce = (darts: Dart[], from = 0) => announcementSince(play(darts), from, 3, names);

describe("rundemeldinger", () => {
  it("ingen melding midt i en runde", () => {
    expect(announce([d(20), d(20)])).toBeNull();
  });

  it("tre bom gir en negativ melding", () => {
    const a = announce([miss, miss, miss]);
    expect(a).toMatchObject({ tone: "roast", teamIndex: 0, seq: 2 });
  });

  it("treff som teller avgjør tonen", () => {
    expect(announce([d(20), miss, miss])?.tone).toBe("meh");
    expect(announce([d(20), d(19), miss])?.tone).toBe("good");
    expect(announce([d(20), d(20), d(20)])?.tone).toBe("great");
  });

  it("treff på et felt laget har lukket regnes ikke som treff", () => {
    expect(announce([d(20), d(20), d(20), miss, miss, miss, d(20), d(20), miss])?.tone).toBe("wasted");
  });

  it("vinnerpila gir vinnermelding selv midt i runden", () => {
    const darts = MICKEY_TARGETS.flatMap((f) => [d(f), d(f), d(f), miss, miss, miss]).slice(0, -3);
    const a = announce(darts);
    expect(a?.tone).toBe("win");
    expect(a?.text).toContain("Lag A");
  });

  it("finner bare runder som er fullført etter fromSeq", () => {
    expect(announce([miss, miss, miss, d(20)], 3)).toBeNull();
    expect(announce([miss, miss, miss, d(20)], 0)?.seq).toBe(2);
  });

  it("samme runde gir samme melding (alle skjermer viser det samme)", () => {
    expect(pickMessage("roast", 5, { spiller: "Ola", lag: "A" })).toBe(pickMessage("roast", 5, { spiller: "Ola", lag: "A" }));
    expect(pickMessage("great", 2, { spiller: "Ola", lag: "A" })).not.toContain("{spiller}");
  });

  it("tone uten treff og uten noe kast på skiva er roast", () => {
    expect(toneForTurn([], false)).toBe("roast");
  });
});
