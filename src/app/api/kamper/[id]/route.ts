import { handle } from "@/lib/api";
import { getMatch, MatchError } from "@/lib/matches";

// Polling-endepunkt: ?v=<versjon> gir { changed: false } hvis ingenting er nytt.
export async function GET(req: Request, ctx: RouteContext<"/api/kamper/[id]">) {
  const { id } = await ctx.params;
  const since = new URL(req.url).searchParams.get("v");
  return handle(null, null, async () => {
    const m = await getMatch(id);
    if (!m) throw new MatchError(404, "Fant ikke kampen");
    if (since && since === m.version) return { changed: false };
    return { changed: true, match: m };
  });
}
