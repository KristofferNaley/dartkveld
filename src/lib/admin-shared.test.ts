import { describe, expect, it } from "vitest";
import { fillWeeks, isAdminEmail, makeTempPassword, parseAdminEmails, TEMP_PASSWORD_LENGTH, weekKey } from "./admin-shared";

describe("ADMIN_EMAILS", () => {
  it("deler på komma, semikolon og mellomrom, uten hensyn til store bokstaver", () => {
    const list = parseAdminEmails(" Ola@Example.no, kari@example.no ; per@example.no\n");
    expect(list).toEqual(["ola@example.no", "kari@example.no", "per@example.no"]);
    expect(isAdminEmail("OLA@example.no", list)).toBe(true);
    expect(isAdminEmail("andre@example.no", list)).toBe(false);
  });

  it("tom eller manglende verdi gir ingen admin", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("  ")).toEqual([]);
    expect(isAdminEmail("", [])).toBe(false);
  });
});

describe("midlertidig passord", () => {
  it("har fast lengde og bruker bare tegn uten forveksling", () => {
    let i = 0;
    const pw = makeTempPassword((n) => i++ % n);
    expect(pw).toHaveLength(TEMP_PASSWORD_LENGTH);
    expect(pw).not.toMatch(/[01OIl]/);
    expect(pw.length).toBeGreaterThanOrEqual(8); // Better Auth krever minst 8 tegn
  });
});

describe("uker", () => {
  it("uka starter mandag i Oslo-tid", () => {
    expect(weekKey(new Date("2026-11-09T10:00:00Z"))).toBe("2026-11-09"); // mandag
    expect(weekKey(new Date("2026-11-15T10:00:00Z"))).toBe("2026-11-09"); // søndag
    expect(weekKey(new Date("2026-11-15T23:30:00Z"))).toBe("2026-11-16"); // 00:30 mandag i Oslo
  });

  it("fyller ut uker uten aktivitet med 0, eldste først", () => {
    const filled = fillWeeks([{ week: "2026-11-02", n: 5 }, { week: "2026-11-09", n: 2 }], 4, new Date("2026-11-11T12:00:00Z"));
    expect(filled).toEqual([
      { week: "2026-10-19", n: 0 },
      { week: "2026-10-26", n: 0 },
      { week: "2026-11-02", n: 5 },
      { week: "2026-11-09", n: 2 },
    ]);
  });
});
