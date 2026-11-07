import { ImageResponse } from "next/og";
import { teamColor } from "@/lib/colors";
import { getSharedResult } from "@/lib/result";

export const alt = "Resultat fra Dartkveld";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await getSharedResult(token);

  if (!r) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e15", color: "#fff", fontSize: 64 }}>
          Dartkveld
        </div>
      ),
      size,
    );
  }

  const color = teamColor(r.winnerIndex);
  const scores = r.scores.slice(0, 4);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0e15",
          color: "#f1f5fb",
          padding: "56px 64px",
          borderTop: `16px solid ${color}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#8a99b3" }}>
          <div style={{ display: "flex", width: 40, height: 40, borderRadius: 40, border: "4px solid #f5b301", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
            <div style={{ width: 14, height: 14, borderRadius: 14, background: "#f43f5e" }} />
          </div>
          <span>Dartkveld · {r.game.name}</span>
          <span style={{ marginLeft: "auto" }}>{r.date}</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 52, color: "#8a99b3", letterSpacing: 4 }}>VINNER</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color, lineHeight: 1.05, marginTop: 4 }}>
          {r.winner.name.length > 22 ? `${r.winner.name.slice(0, 21)}…` : r.winner.name}
        </div>
        <div style={{ display: "flex", marginTop: "auto", gap: 24 }}>
          {scores.map((s) => (
            <div
              key={s.index}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                background: "#121925",
                borderRadius: 24,
                padding: "20px 28px",
                border: `3px solid ${s.index === r.winnerIndex ? teamColor(s.index) : "#263247"}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 30, color: teamColor(s.index), overflow: "hidden", whiteSpace: "nowrap" }}>
                {s.name.length > 16 ? `${s.name.slice(0, 15)}…` : s.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", fontSize: 72, fontWeight: 800 }}>
                {s.score}
                <span style={{ fontSize: 26, color: "#8a99b3", marginLeft: 14 }}>{r.scoreLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
