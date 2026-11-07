// Morsomme meldinger etter hver runde. Ren logikk uten React, så den kan testes.
import type { BaseGameState, LoggedDart } from "@/games/core/types";

export type Tone = "roast" | "wasted" | "meh" | "good" | "great" | "win";

export interface Announcement {
  /** seq for siste pil i runden; unik nøkkel */
  seq: number;
  teamIndex: number;
  tone: Tone;
  emoji: string;
  text: string;
}

const MESSAGES: Record<Tone, string[]> = {
  roast: [
    "Tre bom! {spiller} sikter visst på tapetet.",
    "{spiller} treffer ikke låvedøra engang.",
    "Skiva henger der borte, {spiller}.",
    "Nydelige kast … for veggen.",
    "Var det vinden, {spiller}?",
    "{spiller} spiller visst et helt annet spill.",
    "Null treff. Ta en slurk og prøv igjen.",
    "Brillene, {spiller}! Hvor er brillene?",
    "Pilene ville visst ikke i dag.",
    "{spiller} gir motstanderne en gratis runde.",
  ],
  wasted: [
    "Treff, men på feil felt. Det teller ikke, {spiller}.",
    "{spiller} treffer lukkede felt med imponerende presisjon.",
    "Flott sikte, feil mål.",
  ],
  meh: [
    "Ett treff. Det er en start, {spiller}.",
    "{spiller} lever! Men bare så vidt.",
    "Bedre enn ingenting.",
    "En av tre. Statistikken er ikke på din side.",
    "Sakte, men sikkert, {spiller}.",
  ],
  good: [
    "Pent, {spiller}!",
    "To treff! Nå begynner det å ligne noe.",
    "{spiller} har varmet opp.",
    "Solid runde!",
    "Der satt de, {spiller}!",
  ],
  great: [
    "Tre av tre! {spiller} er i fyr og flamme!",
    "Perfekt runde, {spiller}!",
    "Maskin! {spiller} bommer ikke.",
    "Proffnivå, {spiller}!",
    "Hvem slapp {spiller} løs?",
  ],
  win: ["{lag} har lukket alt og vinner!", "Kampen er over: {lag} vinner!", "Gratulerer, {lag}!"],
};

const EMOJI: Record<Tone, string> = { roast: "🙈", wasted: "🤷", meh: "😐", good: "👍", great: "🔥", win: "🏆" };

export function toneForTurn(darts: LoggedDart[], won: boolean): Tone {
  if (won) return "win";
  const hits = darts.reduce((n, d) => n + d.marks, 0);
  if (hits >= 3) return "great";
  if (hits === 2) return "good";
  if (hits === 1) return "meh";
  return darts.some((d) => d.field !== 0) ? "wasted" : "roast";
}

/** Velg melding deterministisk ut fra seq, så alle skjermer viser den samme. */
export function pickMessage(tone: Tone, seq: number, names: { spiller: string; lag: string }): string {
  const list = MESSAGES[tone];
  const template = list[(seq * 7 + 3) % list.length];
  return template.replaceAll("{spiller}", names.spiller).replaceAll("{lag}", names.lag);
}

/**
 * Siste runde som ble fullført med en pil med seq >= fromSeq, eller null.
 * En runde er fullført når laget har kastet alle pilene, eller når kampen er vunnet.
 */
export function announcementSince(
  state: BaseGameState,
  fromSeq: number,
  dartsPerTurn: number,
  names: (teamIndex: number, playerId: string) => { spiller: string; lag: string },
): Announcement | null {
  for (let i = state.log.length - 1; i >= fromSeq && i >= 0; i--) {
    const last = state.log[i];
    const isLastDart = i === state.log.length - 1;
    const won = isLastDart && state.finished;
    if (last.dartIndex !== dartsPerTurn - 1 && !won) continue;
    const darts = state.log.filter((d) => d.round === last.round && d.teamIndex === last.teamIndex);
    const tone = toneForTurn(darts, won);
    return {
      seq: last.seq,
      teamIndex: last.teamIndex,
      tone,
      emoji: EMOJI[tone],
      text: pickMessage(tone, last.seq, names(last.teamIndex, last.playerId)),
    };
  }
  return null;
}
