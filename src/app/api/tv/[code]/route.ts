import { NextResponse } from "next/server";
import { normalizeMatchCode } from "@/lib/codes";
import { getMatchByCode } from "@/lib/matches";

// Åpent polling-endepunkt for TV: kampkoden er nøkkelen, og svaret er skrivebeskyttet.
// Delingslenken (shareToken) sendes aldri ut her.
export async function GET(req: Request, ctx: RouteContext<"/api/tv/[code]">) {
  const { code } = await ctx.params;
  const normalized = normalizeMatchCode(code);
  const m = normalized ? await getMatchByCode(normalized) : null;
  const headers = { "Cache-Control": "no-store" };
  if (!m) return NextResponse.json({ error: "Fant ikke kampen" }, { status: 404, headers });
  const since = new URL(req.url).searchParams.get("v");
  if (since && since === m.version) return NextResponse.json({ changed: false }, { headers });
  return NextResponse.json({ changed: true, match: { ...m, shareToken: null } }, { headers });
}
