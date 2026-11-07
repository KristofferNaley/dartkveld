/**
 * Treffmerking: tre plasser som fylles med en pil (🎯) per treff. Størrelsen følger
 * font-size fra forelderen, så samme komponent brukes på mobil og TV.
 */
export function Marks({ count, muted = false, className = "" }: { count: number; muted?: boolean; className?: string }) {
  const hits = Math.min(count, 3);
  return (
    <span
      className={`inline-flex items-center justify-center gap-[0.12em] leading-none ${muted ? "opacity-35 grayscale" : ""} ${className}`}
      role="img"
      aria-label={hits >= 3 ? "lukket" : `${hits} av 3 treff`}
    >
      {[0, 1, 2].map((i) =>
        i < hits ? (
          <span key={i} className="inline-block w-[1.15em] text-center">
            🎯
          </span>
        ) : (
          <span key={i} className="inline-flex w-[1.15em] justify-center">
            <span className="inline-block h-[0.42em] w-[0.42em] rounded-full border-[0.08em] border-white/25" />
          </span>
        ),
      )}
    </span>
  );
}
