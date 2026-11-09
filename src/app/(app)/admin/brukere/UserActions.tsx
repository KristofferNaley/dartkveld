"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { banAction, deleteUserAction, matchCountAction, tempPasswordAction } from "./actions";

export function UserActions({ id, name, banned, isSelf }: { id: string; name: string; banned: boolean; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; password?: string; error?: boolean } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; password?: string; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? { text: okText, password: res.password } : { text: res.error ?? "Feilet", error: true });
    });

  async function remove() {
    const n = await matchCountAction(id);
    const warning = n > 0 ? `\n\n${n} ${n === 1 ? "kamp" : "kamper"} brukeren har opprettet slettes også, og kan ikke hentes tilbake.` : "";
    if (!window.confirm(`Slette ${name} for godt?${warning}`)) return;
    run(() => deleteUserAction(id), "Slettet");
  }

  return (
    <div className="space-y-1.5 sm:max-w-xs sm:text-right">
      <div className="flex flex-wrap gap-1 sm:justify-end">
        <Button
          size="sm" className="!h-8 !px-2.5 !text-xs" variant="secondary" disabled={pending}
          onClick={() => window.confirm(`Sette et nytt midlertidig passord for ${name}? Hen blir logget ut overalt.`) && run(() => tempPasswordAction(id), "Nytt passord er satt. Gi det til brukeren:")}
        >
          Nytt passord
        </Button>
        {!isSelf && (
          <Button size="sm" className="!h-8 !px-2.5 !text-xs" variant="ghost" disabled={pending} onClick={() => run(() => banAction(id, !banned), banned ? "Sperren er opphevet" : "Sperret")}>
            {banned ? "Opphev sperre" : "Sperr"}
          </Button>
        )}
        {!isSelf && (
          <Button size="sm" className="!h-8 !px-2.5 !text-xs" variant="danger" disabled={pending} onClick={remove}>
            Slett
          </Button>
        )}
      </div>
      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.error ? "bg-danger/15 text-danger" : "bg-ok/15 text-ok"}`} role="status">
          {message.text}
          {message.password && (
            <>
              {" "}
              <code className="tabular rounded bg-bg px-2 py-0.5 text-base font-bold text-white select-all">{message.password}</code>
              <span className="block text-xs text-muted">Vises bare nå. Brukeren kan bytte det under Profil.</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
