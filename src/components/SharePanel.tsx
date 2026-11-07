"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { setSharingAction } from "@/app/(app)/kamp/[id]/actions";
import { Button, Card, ErrorText } from "./ui";

/** Deling av ferdig kamp: kopier lenke, Web Share, og eier kan trekke tilbake / dele på nytt. */
export function SharePanel({
  matchId,
  appUrl,
  token,
  isOwner,
  title,
  onTokenChange,
}: {
  matchId: string;
  appUrl: string;
  token: string | null;
  isOwner: boolean;
  title: string;
  onTokenChange: (token: string | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = token ? `${appUrl}/r/${token}` : null;
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  const toggle = (enabled: boolean) =>
    startTransition(async () => {
      setError(null);
      const res = await setSharingAction(matchId, enabled);
      if (res.error) setError(res.error);
      else onTokenChange(res.token ?? null);
    });

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Del resultatet</h2>
      {url ? (
        <>
          <a href={url} target="_blank" rel="noreferrer" className="block truncate rounded-lg bg-bg px-3 py-2.5 text-sm text-accent underline">
            {url}
          </a>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Kopiert!" : "Kopier lenke"}
            </Button>
            {canShare && (
              <Button variant="secondary" onClick={() => navigator.share({ title, text: title, url }).catch(() => {})}>
                Del ...
              </Button>
            )}
            {isOwner && (
              <Button variant="ghost" disabled={pending} onClick={() => toggle(false)}>
                Trekk tilbake deling
              </Button>
            )}
          </div>
          <p className="text-xs text-muted">Alle med lenken kan se resultatet, uten å logge inn.</p>
        </>
      ) : isOwner ? (
        <>
          <p className="text-sm text-muted">Delingen er slått av.</p>
          <Button disabled={pending} onClick={() => toggle(true)}>
            Lag ny delingslenke
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted">Eieren av kampen har ikke delt resultatet.</p>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
