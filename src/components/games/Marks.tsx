/** Treffmerker som på en kritt-tavle: / for 1, X for 2, X i sirkel for lukket. */
export function Marks({ count, color, className = "h-7 w-7" }: { count: number; color: string; className?: string }) {
  const label = count >= 3 ? "lukket" : `${count} treff`;
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label={label}>
      {count === 0 && <circle cx="20" cy="20" r="2.5" fill="currentColor" opacity="0.25" />}
      {count >= 1 && <line x1="10" y1="30" x2="30" y2="10" stroke={color} strokeWidth="5" strokeLinecap="round" />}
      {count >= 2 && <line x1="10" y1="10" x2="30" y2="30" stroke={color} strokeWidth="5" strokeLinecap="round" />}
      {count >= 3 && <circle cx="20" cy="20" r="17" fill="none" stroke={color} strokeWidth="4" />}
    </svg>
  );
}
