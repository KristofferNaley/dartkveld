"use client";
import type { Announcement, Tone } from "@/lib/announcements";

const TONE_STYLE: Record<Tone, { bg: string; border: string }> = {
  roast: { bg: "#3b0d16", border: "#f43f5e" },
  wasted: { bg: "#3a2408", border: "#fb923c" },
  meh: { bg: "#1f2937", border: "#94a3b8" },
  good: { bg: "#0b3326", border: "#34d399" },
  great: { bg: "#3a2a00", border: "#f5b301" },
  win: { bg: "#3a2a00", border: "#f5b301" },
};

/** Melding etter runden. size="tv" fyller midten av skjermen, ellers et banner øverst. */
export function AnnouncementToast({
  announcement,
  size = "compact",
  onDismiss,
}: {
  announcement: Announcement | null;
  size?: "compact" | "tv";
  onDismiss: () => void;
}) {
  if (!announcement) return null;
  const style = TONE_STYLE[announcement.tone];
  const tv = size === "tv";
  return (
    <div
      className={`fixed inset-x-0 z-50 flex justify-center px-4 ${tv ? "inset-y-0 items-center bg-black/40" : "top-[calc(4rem+env(safe-area-inset-top))]"}`}
      onClick={onDismiss}
      role="status"
      aria-live="polite"
    >
      <div
        key={announcement.seq}
        className={`announce-pop flex max-w-[min(92vw,70rem)] items-center rounded-3xl border-4 shadow-2xl ${
          tv ? "gap-[3vh] px-[5vh] py-[4vh]" : "w-full max-w-md gap-3 px-4 py-3"
        }`}
        style={{ background: style.bg, borderColor: style.border }}
      >
        <span className={tv ? "text-[clamp(3rem,16vh,14rem)] leading-none" : "text-4xl"}>{announcement.emoji}</span>
        <p className={`font-black leading-tight text-white ${tv ? "text-[clamp(1.5rem,7vh,7rem)]" : "text-lg"}`}>{announcement.text}</p>
      </div>
    </div>
  );
}
