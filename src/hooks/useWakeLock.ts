"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Holder skjermen våken (Screen Wake Lock API) så lenge komponenten er montert. */
export function useWakeLock(enabled = true) {
  const [active, setActive] = useState(false);
  const supported = useSyncExternalStore(noopSubscribe, () => "wakeLock" in navigator, () => true);

  useEffect(() => {
    if (!enabled) return;
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    // Låsen slippes automatisk når fanen skjules, så hent den igjen når den vises
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [enabled]);

  return { active, supported };
}
