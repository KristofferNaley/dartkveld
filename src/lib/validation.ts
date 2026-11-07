import { z } from "zod";
import { GAME_TYPES } from "@/games";

export const dartSchema = z.object({
  field: z.number().int().min(0).max(25),
  multiplier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const registerDartsSchema = z.object({
  expectedSeq: z.number().int().min(0),
  darts: z.array(dartSchema).min(1).max(3),
});

export const undoSchema = z.object({
  expectedSeq: z.number().int().min(1),
});

const name = z.string().trim().min(1, "Navn mangler").max(40, "Navnet er for langt");

export const newPlayerSchema = z.union([
  z.object({ kind: z.literal("user"), userId: z.string().min(1) }),
  z.object({ kind: z.literal("guest"), name }),
]);

export const newMatchSchema = z
  .object({
    gameType: z.enum(GAME_TYPES),
    teams: z
      .array(z.object({ name, players: z.array(newPlayerSchema).min(1, "Hvert lag trenger minst én spiller").max(8) }))
      .min(2, "Velg minst 2 lag")
      .max(8, "Maks 8 lag"),
  })
  .superRefine((val, ctx) => {
    const seen = new Set<string>();
    for (const t of val.teams) {
      for (const p of t.players) {
        if (p.kind !== "user") continue;
        if (seen.has(p.userId)) ctx.addIssue({ code: "custom", message: "En bruker kan bare være med én gang i en kamp" });
        seen.add(p.userId);
      }
    }
  });

export type NewMatchInput = z.infer<typeof newMatchSchema>;
