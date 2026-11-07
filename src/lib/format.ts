const dateFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Oslo" });
const dateTimeFmt = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Oslo",
});

export function formatDate(d: Date | string): string {
  return dateFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatDateTime(d: Date | string): string {
  return dateTimeFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatPercent(x: number): string {
  return `${Math.round(x * 100)} %`;
}
