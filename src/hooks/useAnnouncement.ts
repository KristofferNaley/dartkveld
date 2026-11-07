"use client";
import { useEffect, useState } from "react";
import type { BaseGameState } from "@/games/core/types";
import { announcementSince, type Announcement } from "@/lib/announcements";
import { playerName, type MatchDTO } from "@/lib/match-types";

const SHOW_MS = 3800;

/**
 * Viser en melding når en runde fullføres. Ingen melding ved første lasting eller ved angre.
 * Bruker «juster state under rendering»-mønsteret i stedet for refs.
 */
export function useAnnouncement(match: MatchDTO, state: BaseGameState, dartsPerTurn: number) {
  const [prevLen, setPrevLen] = useState(state.log.length);
  const [current, setCurrent] = useState<Announcement | null>(null);

  if (state.log.length !== prevLen) {
    setPrevLen(state.log.length);
    if (state.log.length > prevLen) {
      const a = announcementSince(state, prevLen, dartsPerTurn, (ti, pid) => ({
        lag: match.teams[ti].name,
        spiller: playerName(match, pid),
      }));
      if (a) setCurrent(a);
    } else {
      setCurrent(null); // angre skjuler meldingen
    }
  }

  useEffect(() => {
    if (!current || current.tone === "win") return; // vinnermeldingen blir stående til den lukkes
    const t = setTimeout(() => setCurrent(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  return { announcement: current, dismiss: () => setCurrent(null) };
}
