export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#121925" stroke="#f5b301" strokeWidth="2" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#f43f5e" strokeWidth="3" />
      <circle cx="16" cy="16" r="4.5" fill="#34d399" />
      <circle cx="16" cy="16" r="1.8" fill="#f43f5e" />
    </svg>
  );
}
