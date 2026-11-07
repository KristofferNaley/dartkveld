import { NextResponse, type NextRequest } from "next/server";

/**
 * Bak Cloudflare: send vanlig HTTP videre til HTTPS. Innloggingen godtar bare den
 * offentlige https-adressen (APP_URL), og passord skal aldri gå ukryptert.
 * Lokalt (uten cf-ray) gjøres ingenting, så http://localhost fungerer som før.
 */
export function proxy(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto === "http" && req.headers.has("cf-ray")) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = req.headers.get("host") ?? url.host;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
