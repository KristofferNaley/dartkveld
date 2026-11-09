"use client";
import { useState } from "react";
import { Button } from "./ui";

/** Invitasjonslenken med kopier- og del-knapp. */
export function InviteLink({ url, groupName }: { url: string; groupName: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Kopier lenken:", url);
    }
  }

  return (
    <div className="space-y-2">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Invitasjonslenke" className="h-12 w-full rounded-xl border border-line bg-bg px-3 text-sm" />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={copy} className="flex-1">
          {copied ? "Kopiert ✓" : "Kopier lenken"}
        </Button>
        {canShare && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => navigator.share({ title: "Dartkveld", text: `Bli med i ${groupName} på Dartkveld`, url }).catch(() => undefined)}
          >
            Del
          </Button>
        )}
      </div>
    </div>
  );
}
