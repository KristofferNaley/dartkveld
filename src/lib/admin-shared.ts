// Ren adminlogikk uten database, så den kan testes.

/** ADMIN_EMAILS: kommaseparert liste. Sammenlignes uten hensyn til store/små bokstaver. */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string, admins: string[]): boolean {
  return admins.includes(email.trim().toLowerCase());
}

/** Tegn uten de som forveksles (0/O, 1/l/I), så passordet er lett å lese opp og skrive av. */
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TEMP_PASSWORD_LENGTH = 12;

/** Lager et midlertidig passord. `pick(n)` gir et tilfeldig tall fra 0 til n-1 (crypto.randomInt på serveren). */
export function makeTempPassword(pick: (n: number) => number): string {
  let out = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) out += PASSWORD_ALPHABET[pick(PASSWORD_ALPHABET.length)];
  return out;
}

const osloDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" });

/** Mandagen (YYYY-MM-DD) i uka til tidspunktet, regnet i Oslo-tid. */
export function weekKey(d: Date): string {
  const [y, m, day] = osloDay.format(d).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  const dow = (date.getUTCDay() + 6) % 7; // mandag = 0
  date.setUTCDate(date.getUTCDate() - dow);
  return date.toISOString().slice(0, 10);
}

/**
 * Fyller ut en tidsserie med én rad per uke, eldste først, slik at uker uten aktivitet får 0.
 * `rows` har uke (mandagen, YYYY-MM-DD) og antall.
 */
export function fillWeeks(rows: { week: string; n: number }[], weeks: number, now: Date): { week: string; n: number }[] {
  const byWeek = new Map(rows.map((r) => [r.week, r.n]));
  const [y, m, d] = weekKey(now).split("-").map(Number);
  const out: { week: string; n: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const week = new Date(Date.UTC(y, m - 1, d - 7 * i)).toISOString().slice(0, 10);
    out.push({ week, n: byWeek.get(week) ?? 0 });
  }
  return out;
}
