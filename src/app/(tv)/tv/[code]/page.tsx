import { notFound } from "next/navigation";
import { normalizeMatchCode } from "@/lib/codes";
import { getMatchByCode } from "@/lib/matches";
import { TvScreen } from "../../kamp/[id]/vis/TvScreen";

export const metadata = { title: "Visningsmodus", robots: { index: false } };

// Åpen for alle med koden: skrivebeskyttet, ingen innlogging
export default async function TvByCodePage({ params }: PageProps<"/tv/[code]">) {
  const { code } = await params;
  const normalized = normalizeMatchCode(code);
  if (!normalized) notFound();
  const match = await getMatchByCode(normalized);
  if (!match) notFound();
  // Delingslenken hører ikke hjemme hos en anonym seer
  return <TvScreen initial={{ ...match, shareToken: null }} readOnly />;
}
