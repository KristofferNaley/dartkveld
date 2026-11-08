"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { getGameUi } from "@/components/games/registry";
import { AnnouncementToast } from "@/components/AnnouncementToast";
import { Keypad } from "@/components/Keypad";
import { SharePanel } from "@/components/SharePanel";
import { TurnBanner } from "@/components/TurnBanner";
import { buttonClass, ErrorText } from "@/components/ui";
import { useAnnouncement } from "@/hooks/useAnnouncement";
import { useScoring } from "@/hooks/useScoring";
import { teamPlayers, type MatchDTO } from "@/lib/match-types";
import { deleteMatchAction } from "./actions";

export function MatchScreen({
  initial,
  canScore,
  isOwner,
  appUrl,
}: {
  initial: MatchDTO;
  canScore: boolean;
  isOwner: boolean;
  appUrl: string;
}) {
  const { match, confirmed, state, game, throwDarts, undo, error, syncing } = useScoring(initial);
  const [shareToken, setShareToken] = useState<string | null | undefined>(undefined);
  const [deleting, startDelete] = useTransition();
  const ui = getGameUi(match.gameType);
  const { announcement, dismiss } = useAnnouncement(match, state, game.dartsPerTurn);
  const token = shareToken === undefined ? confirmed.shareToken : shareToken;
  const winner = state.winnerTeamIndex !== null ? teamPlayers(match.teams[state.winnerTeamIndex]) : null;

  return (
    <div className="space-y-4">
      <AnnouncementToast announcement={announcement} onDismiss={dismiss} />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{game.name}</h1>
          <p className="text-xs text-muted">{syncing ? "Lagrer ..." : "Alle kast er lagret"}</p>
        </div>
        <Link href={`/kamp/${match.id}/vis`} className={buttonClass({ variant: "secondary", size: "sm" })}>
          📺 Visningsmodus
        </Link>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-4 lg:order-2">
          <TurnBanner match={match} state={state} />
          <ErrorText>{error}</ErrorText>
          {canScore ? (
            <Keypad
              game={game}
              disabled={state.finished}
              dartsLeft={state.finished ? 0 : game.dartsPerTurn - state.turn.dartIndex}
              canUndo={match.throws.length > 0}
              onDarts={throwDarts}
              onUndo={undo}
            />
          ) : (
            <p className="rounded-xl bg-panel p-3 text-sm text-muted">Du ser på kampen. Bare deltakere og eier kan føre poeng.</p>
          )}
          {confirmed.status === "finished" && !syncing && (
            <SharePanel
              matchId={match.id}
              appUrl={appUrl}
              token={token}
              isOwner={isOwner}
              title={`${winner} vant ${game.name}`}
              onTokenChange={setShareToken}
            />
          )}
        </div>
        <div className="lg:order-1">
          <ui.Board match={match} state={state} />
        </div>
      </div>

      {isOwner && (
        <div className="pt-6 text-center">
          <button
            type="button"
            disabled={deleting}
            className="text-sm text-muted underline hover:text-danger"
            onClick={() => {
              if (confirm("Slette kampen og alle kast? Dette kan ikke angres.")) startDelete(async () => void (await deleteMatchAction(match.id)));
            }}
          >
            Slett kamp
          </button>
        </div>
      )}
    </div>
  );
}
