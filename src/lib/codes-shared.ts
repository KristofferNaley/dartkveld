/** Kampkode: 5 tegn uten tegn som kan forveksles (ingen 0/O, 1/I). Ren logikk som også brukes i nettleseren. */
export const MATCH_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MATCH_CODE_LENGTH = 5;

/**
 * Gjør det brukeren skrev om til en kampkode: store bokstaver, uten mellomrom og bindestrek.
 * Returnerer null hvis resultatet ikke kan være en kode.
 */
export function normalizeMatchCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== MATCH_CODE_LENGTH) return null;
  for (const ch of code) if (!MATCH_CODE_ALPHABET.includes(ch)) return null;
  return code;
}
