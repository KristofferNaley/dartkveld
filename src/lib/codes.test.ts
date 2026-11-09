import { describe, expect, it } from "vitest";
import { isInviteCodeShape, MATCH_CODE_ALPHABET, MATCH_CODE_LENGTH, newInviteCode, newMatchCode, normalizeMatchCode } from "./codes";

describe("kampkode", () => {
  it("har fem tegn fra alfabetet uten forvekslingstegn", () => {
    for (let i = 0; i < 200; i++) {
      const code = newMatchCode();
      expect(code).toHaveLength(MATCH_CODE_LENGTH);
      for (const ch of code) expect(MATCH_CODE_ALPHABET).toContain(ch);
    }
    expect(MATCH_CODE_ALPHABET).not.toMatch(/[01OI]/);
  });

  it("normaliserer det brukeren skriver", () => {
    expect(normalizeMatchCode("k7q2x")).toBe("K7Q2X");
    expect(normalizeMatchCode(" k7q-2x ")).toBe("K7Q2X");
  });

  it("avviser feil lengde og ugyldige tegn", () => {
    expect(normalizeMatchCode("K7Q2")).toBeNull();
    expect(normalizeMatchCode("K7Q2XX")).toBeNull();
    expect(normalizeMatchCode("K7Q20")).toBeNull(); // 0 finnes ikke i alfabetet
    expect(normalizeMatchCode("")).toBeNull();
  });
});

describe("invitasjonskode", () => {
  it("er lang og unik nok, og godtas av formsjekken", () => {
    const a = newInviteCode();
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(a).not.toBe(newInviteCode());
    expect(isInviteCodeShape(a)).toBe(true);
    expect(isInviteCodeShape("0123456789abcdef")).toBe(true); // migrasjonens hex-kode
  });

  it("avviser ugyldige former", () => {
    expect(isInviteCodeShape("kort")).toBe(false);
    expect(isInviteCodeShape("har mellomrom i seg 123")).toBe(false);
    expect(isInviteCodeShape("../../etc/passwd")).toBe(false);
  });
});
