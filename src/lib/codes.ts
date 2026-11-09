import { randomBytes, randomInt } from "node:crypto";
import { MATCH_CODE_ALPHABET, MATCH_CODE_LENGTH } from "./codes-shared";

export { MATCH_CODE_ALPHABET, MATCH_CODE_LENGTH, normalizeMatchCode } from "./codes-shared";

export function newMatchCode(): string {
  let code = "";
  for (let i = 0; i < MATCH_CODE_LENGTH; i++) code += MATCH_CODE_ALPHABET[randomInt(MATCH_CODE_ALPHABET.length)];
  return code;
}

/** Invitasjonskode for en gruppe: lang nok til at den ikke kan gjettes. */
export function newInviteCode(): string {
  return randomBytes(12).toString("base64url");
}

/** Godtar både koder fra appen og fra migrasjonen (hex). */
export function isInviteCodeShape(code: string): boolean {
  return /^[A-Za-z0-9_-]{8,40}$/.test(code);
}
