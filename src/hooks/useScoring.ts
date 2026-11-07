"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getGame } from "@/games";
import { replay } from "@/games/core/engine";
import { GameRuleError, type Dart } from "@/games/core/types";
import { defaultFeed, type MatchFeed } from "@/lib/live/feed";
import { setupFromMatch, type MatchDTO } from "@/lib/match-types";

type Op = { kind: "darts"; darts: Dart[] } | { kind: "undo" };

function applyOps(throws: Dart[], ops: Op[]): Dart[] {
  const out = [...throws];
  for (const op of ops) {
    if (op.kind === "darts") out.push(...op.darts);
    else out.pop();
  }
  return out;
}

/**
 * Poengføring med optimistisk visning. Endringer legges i en kø og sendes én og én
 * med forventet løpenummer, så to telefoner aldri kan føre «oppå» hverandre.
 */
export function useScoring(initial: MatchDTO, feed: MatchFeed = defaultFeed) {
  const [confirmed, setConfirmed] = useState(initial);
  const [queue, setQueue] = useState<Op[]>([]);
  const [error, setError] = useState<string | null>(null);
  const confirmedRef = useRef(initial);
  const queueRef = useRef<Op[]>([]);
  const busyRef = useRef(false);

  const game = getGame(initial.gameType);
  const setup = useMemo(() => setupFromMatch(confirmed), [confirmed]);
  const match = useMemo(() => ({ ...confirmed, throws: applyOps(confirmed.throws, queue) }), [confirmed, queue]);
  const state = useMemo(() => replay(game, setup, match.throws), [game, setup, match.throws]);

  const accept = useCallback((m: MatchDTO) => {
    confirmedRef.current = m;
    setConfirmed(m);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/kamper/${initial.id}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) {
      const data = (await res.json()) as { match?: MatchDTO };
      if (data.match) accept(data.match);
    }
  }, [accept, initial.id]);

  const pump = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const op = queueRef.current[0];
        const expectedSeq = confirmedRef.current.throws.length;
        const url = `/api/kamper/${initial.id}/${op.kind === "undo" ? "angre" : "kast"}`;
        const body = op.kind === "undo" ? { expectedSeq } : { expectedSeq, darts: op.darts };
        let res: Response;
        try {
          res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } catch {
          queueRef.current = [];
          setQueue([]);
          setError("Mistet forbindelsen. Det siste kastet ble ikke lagret, sjekk tavla.");
          await refresh();
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { match?: MatchDTO; error?: string };
        if (!res.ok) {
          queueRef.current = [];
          setQueue([]);
          setError(data.error ?? "Kunne ikke lagre");
          if (data.match) accept(data.match);
          else await refresh();
          return;
        }
        queueRef.current = queueRef.current.slice(1);
        if (data.match) confirmedRef.current = data.match;
        // Oppdater bekreftet state og kø samtidig, så visningen ikke blinker
        setConfirmed(confirmedRef.current);
        setQueue(queueRef.current);
      }
    } finally {
      busyRef.current = false;
    }
  }, [accept, initial.id, refresh]);

  const enqueue = useCallback(
    (op: Op) => {
      setError(null);
      queueRef.current = [...queueRef.current, op];
      setQueue(queueRef.current);
      void pump();
    },
    [pump],
  );

  const throwDarts = useCallback(
    (darts: Dart[]) => {
      try {
        darts.reduce((s, d) => (s.finished ? s : game.apply(s, d)), state);
      } catch (err) {
        setError(err instanceof GameRuleError ? err.message : "Ugyldig kast");
        return;
      }
      enqueue({ kind: "darts", darts });
    },
    [enqueue, game, state],
  );

  const undo = useCallback(() => {
    if (match.throws.length === 0) return;
    enqueue({ kind: "undo" });
  }, [enqueue, match.throws.length]);

  // Live-oppdateringer fra andre enheter, bare når vi ikke selv har noe på vei
  useEffect(() => {
    return feed.subscribe(
      initial.id,
      () => confirmedRef.current.version,
      (m) => {
        if (queueRef.current.length === 0 && !busyRef.current) accept(m);
      },
    );
  }, [accept, feed, initial.id]);

  return { match, confirmed, state, game, throwDarts, undo, error, clearError: () => setError(null), syncing: queue.length > 0 };
}
