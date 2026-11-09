import type { MatchDTO } from "../match-types";

/**
 * Kilde for live-oppdateringer av en kamp. V1 bruker polling, men grensesnittet
 * er laget slik at en SSE-implementasjon kan byttes inn uten å røre komponentene.
 */
const defaultUrl = (matchId: string, version: string) => `/api/kamper/${matchId}?v=${encodeURIComponent(version)}`;

export interface MatchFeed {
  subscribe(matchId: string, currentVersion: () => string, onUpdate: (match: MatchDTO) => void): () => void;
}

export function createPollingFeed(intervalMs = 2000, urlFor: (matchId: string, version: string) => string = defaultUrl): MatchFeed {
  return {
    subscribe(matchId, currentVersion, onUpdate) {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let inFlight: AbortController | undefined;

      const tick = async () => {
        if (stopped) return;
        if (document.visibilityState === "visible") {
          inFlight = new AbortController();
          try {
            const res = await fetch(urlFor(matchId, currentVersion()), {
              cache: "no-store",
              signal: inFlight.signal,
            });
            if (res.ok) {
              const data = (await res.json()) as { changed: boolean; match?: MatchDTO };
              if (!stopped && data.changed && data.match) onUpdate(data.match);
            }
          } catch {
            // Nettverksfeil: prøv igjen ved neste tick
          }
        }
        if (!stopped) timer = setTimeout(tick, intervalMs);
      };

      const onVisible = () => {
        if (document.visibilityState === "visible") {
          clearTimeout(timer);
          void tick();
        }
      };

      timer = setTimeout(tick, intervalMs);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        stopped = true;
        clearTimeout(timer);
        inFlight?.abort();
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
  };
}

/** Poller en kamp med kampkode uten innlogging (TV). */
export const codeFeed = (code: string) => createPollingFeed(2000, (_id, v) => `/api/tv/${code}?v=${encodeURIComponent(v)}`);

export const defaultFeed: MatchFeed = createPollingFeed(2000);
