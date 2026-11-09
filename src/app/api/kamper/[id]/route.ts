import { handle } from "@/lib/api";
import { isMember } from "@/lib/groups";
import { getMatch, MatchError } from "@/lib/matches";

// Polling-endepunkt: ?v=<versjon> gir { changed: false } hvis ingenting er nytt. Bare for gruppas medlemmer.
export async function GET(req: Request, ctx: RouteContext<"/api/kamper/[id]">) {
  const { id } = await ctx.params;
  const since = new URL(req.url).searchParams.get("v");
  return handle(null, null, async (userId) => {
    const m = await getMatch(id);
    if (!m || !(await isMember(m.groupId, userId))) throw new MatchError(404, "Fant ikke kampen");
    if (since && since === m.version) return { changed: false };
    return { changed: true, match: m };
  });
}
