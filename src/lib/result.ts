import "server-only";
import { cache } from "react";
import { getGame } from "@/games";
import { getGameUi } from "@/components/games/registry";
import { formatDate } from "./format";
import { getMatchByShareToken, matchState } from "./matches";

/** Data for den offentlige resultatsiden og OG-bildet. */
export const getSharedResult = cache(async (token: string) => {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const match = await getMatchByShareToken(token);
  if (!match || match.status !== "finished") return null;
  const state = matchState(match);
  const game = getGame(match.gameType);
  const ui = getGameUi(match.gameType);
  const winnerIndex = state.winnerTeamIndex ?? 0;
  const scores = match.teams.map((t, i) => ({ name: t.name, score: ui.scoreOf(state, i), index: i }));
  const date = formatDate(match.finishedAt ?? match.createdAt);
  const summary = scores.map((s) => `${s.name} ${s.score}`).join(" – ");
  return { match, state, game, winnerIndex, winner: match.teams[winnerIndex], scores, date, summary };
});
