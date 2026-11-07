import { handle } from "@/lib/api";
import { registerDarts } from "@/lib/matches";
import { registerDartsSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: RouteContext<"/api/kamper/[id]/kast">) {
  const { id } = await ctx.params;
  return handle(req, registerDartsSchema, async (userId, body) => ({
    match: await registerDarts(id, userId, body.expectedSeq, body.darts),
  }));
}
