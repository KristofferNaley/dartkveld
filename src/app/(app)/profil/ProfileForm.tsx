"use client";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { updateName } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateName, null);
  return (
    <form action={action} className="space-y-3">
      <Field label="Visningsnavn">
        <input name="name" defaultValue={name} required maxLength={40} className={inputClass} />
      </Field>
      <p className="text-xs text-muted">Navnet vises på tavla, i statistikken og når andre velger deg som spiller.</p>
      <ErrorText>{state?.error}</ErrorText>
      {state?.ok && <p className="text-sm text-ok">Lagret</p>}
      <Button type="submit" disabled={pending}>
        Lagre navn
      </Button>
    </form>
  );
}

const PASSWORD_ERRORS: Record<string, string> = {
  INVALID_PASSWORD: "Nåværende passord er feil",
  PASSWORD_TOO_SHORT: "Det nye passordet må ha minst 8 tegn",
};

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const currentPassword = String(form.get("current") ?? "");
    const newPassword = String(form.get("new") ?? "");
    setError(null);
    setOk(false);
    if (newPassword !== form.get("repeat")) {
      setError("De nye passordene er ikke like");
      return;
    }
    setPending(true);
    // Logger ut andre enheter, så et lekket passord ikke gir videre tilgang
    const res = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setPending(false);
    if (res.error) {
      setError((res.error.code && PASSWORD_ERRORS[res.error.code]) || res.error.message || "Kunne ikke bytte passord");
      return;
    }
    formEl.reset();
    setOk(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Nåværende passord">
        <input name="current" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <Field label="Nytt passord">
        <input name="new" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Gjenta nytt passord">
        <input name="repeat" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <ErrorText>{error}</ErrorText>
      {ok && <p className="text-sm text-ok">Passordet er byttet. Andre enheter er logget ut.</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        Bytt passord
      </Button>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/logg-inn");
        router.refresh();
      }}
    >
      Logg ut
    </Button>
  );
}
