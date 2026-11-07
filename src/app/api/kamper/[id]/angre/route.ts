import { handle } from "@/lib/api";
import { undoLastDart } from "@/lib/matches";
import { undoSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: RouteContext<"/api/kamper/[id]/angre">) {
  const { id } = await ctx.params;
  return handle(req, undoSchema, async (userId, body) => ({
    match: await undoLastDart(id, userId, body.expectedSeq),
  }));
}
