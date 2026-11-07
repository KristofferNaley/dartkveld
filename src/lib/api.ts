import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MatchError } from "./matches";
import { getUser } from "./session";

/** Felles innpakning for route handlers: innlogging, JSON-validering og feilhåndtering. */
export async function handle<S extends z.ZodType>(
  req: Request | null,
  schema: S | null,
  fn: (userId: string, body: z.infer<S>) => Promise<unknown>,
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Du må være logget inn" }, { status: 401 });
  let body: z.infer<S> = undefined as z.infer<S>;
  if (schema && req) {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
    body = parsed.data;
  }
  try {
    const result = await fn(user.id, body);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof MatchError) {
      return NextResponse.json({ error: err.message, match: err.match }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}
