"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getGame } from "@/games";
import { replay } from "@/games/core/engine";
import { getGameUi } from "@/components/games/registry";
import { TurnBanner } from "@/components/TurnBanner";
import { AnnouncementToast } from "@/components/AnnouncementToast";
import { useAnnouncement } from "@/hooks/useAnnouncement";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { useWakeLock } from "@/hooks/useWakeLock";
import { setupFromMatch, type MatchDTO } from "@/lib/match-types";

export function TvScreen({ initial }: { initial: MatchDTO }) {
  const [match] = useLiveMatch(initial);
  const wake = useWakeLock();
  const game = getGame(match.gameType);
  const ui = getGameUi(match.gameType);
  const state = useMemo(() => replay(game, setupFromMatch(match), match.throws), [game, match]);
  const { announcement, dismiss } = useAnnouncement(match, state, game.dartsPerTurn);
  const [chrome, setChrome] = useState(true);

  // Skjul knappene etter litt, vis dem igjen ved bevegelse/trykk
  useEffect(() => {
    let t = setTimeout(() => setChrome(false), 4000);
    const show = () => {
      setChrome(true);
      clearTimeout(t);
      t = setTimeout(() => setChrome(false), 4000);
    };
    window.addEventListener("pointermove", show);
    window.addEventListener("pointerdown", show);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", show);
      window.removeEventListener("pointerdown", show);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col gap-[1.2vh] bg-black p-[1.5vh] text-white">
      <TurnBanner match={match} state={state} size="tv" />
      <div className="min-h-0 flex-1">
        <ui.TvBoard match={match} state={state} />
      </div>
      {ui.TvLegend && <ui.TvLegend />}
      <AnnouncementToast announcement={announcement} size="tv" onDismiss={dismiss} />

      <div
        className={`absolute right-[1.5vh] top-[1.5vh] flex gap-2 transition-opacity ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {!wake.supported && <span className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70">Skjermlås støttes ikke her</span>}
        <button
          type="button"
          className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
        >
          Fullskjerm
        </button>
        <Link href={`/kamp/${match.id}`} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25">
          Til poengføring
        </Link>
      </div>
    </div>
  );
}
