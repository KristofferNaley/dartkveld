"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultFeed, type MatchFeed } from "@/lib/live/feed";
import type { MatchDTO } from "@/lib/match-types";

/** Holder en kamp oppdatert via en MatchFeed. setMatch brukes for svar fra egne endringer. */
export function useLiveMatch(initial: MatchDTO, feed: MatchFeed = defaultFeed) {
  const [match, setMatchState] = useState(initial);
  const ref = useRef(match);

  const setMatch = useCallback((m: MatchDTO) => {
    ref.current = m;
    setMatchState(m);
  }, []);

  useEffect(() => {
    return feed.subscribe(initial.id, () => ref.current.version, setMatch);
  }, [feed, initial.id, setMatch]);

  return [match, setMatch] as const;
}
