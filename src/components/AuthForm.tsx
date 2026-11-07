"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Card, ErrorText, Field, inputClass } from "./ui";

const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Feil e-post eller passord",
  USER_ALREADY_EXISTS: "Det finnes allerede en bruker med denne e-posten",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Det finnes allerede en bruker med denne e-posten",
  PASSWORD_TOO_SHORT: "Passordet må ha minst 8 tegn",
  INVALID_EMAIL: "Ugyldig e-postadresse",
  EMAIL_PASSWORD_SIGN_UP_DISABLED: "Registrering er skrudd av. Spør den som drifter appen.",
};

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("neste"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);
    const res =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(form.get("name") ?? "").trim() });
    if (res.error) {
      setError((res.error.code && messages[res.error.code]) || res.error.message || "Noe gikk galt");
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const query = next !== "/" ? `?neste=${encodeURIComponent(next)}` : "";
  return (
    <Card className="mx-auto max-w-md">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Logg inn" : "Lag konto"}</h1>
        {mode === "register" && (
          <Field label="Visningsnavn">
            <input name="name" required maxLength={40} autoComplete="nickname" className={inputClass} placeholder="F.eks. Kristoffer" />
          </Field>
        )}
        <Field label="E-post">
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Passord">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={inputClass}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Vent litt ..." : mode === "login" ? "Logg inn" : "Lag konto"}
        </Button>
        <p className="text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              Ny her? <Link className="text-accent underline" href={`/registrer${query}`}>Lag konto</Link>
            </>
          ) : (
            <>
              Har du konto? <Link className="text-accent underline" href={`/logg-inn${query}`}>Logg inn</Link>
            </>
          )}
        </p>
      </form>
    </Card>
  );
}
