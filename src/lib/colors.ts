export const TEAM_COLORS = ["#f5b301", "#38bdf8", "#f43f5e", "#34d399", "#a78bfa", "#fb923c", "#a3e635", "#f472b6"];

export function teamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}
