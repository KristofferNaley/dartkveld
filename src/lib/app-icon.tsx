import { ImageResponse } from "next/og";

/**
 * Dartskive-ikonet i valgfri størrelse. «Maskable» har ekstra luft rundt skiva, fordi
 * Android kan klippe ikonet til sirkel/avrundet firkant og bare viser den indre 80 %.
 */
export function appIcon(px: number, opts: { maskable?: boolean } = {}) {
  const scale = opts.maskable ? 0.62 : 0.9;
  const disc = Math.round(px * scale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e15",
        }}
      >
        <svg width={disc} height={disc} viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="15" fill="#121925" stroke="#f5b301" strokeWidth="2" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="#f43f5e" strokeWidth="3" />
          <circle cx="16" cy="16" r="4.5" fill="#34d399" />
          <circle cx="16" cy="16" r="1.8" fill="#f43f5e" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
