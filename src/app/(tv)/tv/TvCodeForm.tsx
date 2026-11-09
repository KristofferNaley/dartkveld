"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MATCH_CODE_LENGTH, normalizeMatchCode } from "@/lib/codes-shared";

export function TvCodeForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeMatchCode(value);
    if (!code) {
      setError(`Koden har ${MATCH_CODE_LENGTH} tegn, for eksempel K7Q2X`);
      return;
    }
    router.push(`/tv/${code}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        autoFocus
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={MATCH_CODE_LENGTH + 1}
        placeholder="K7Q2X"
        aria-label="Kampkode"
        className="h-20 rounded-2xl border-2 border-white/30 bg-white/10 text-center text-5xl font-black tracking-[0.3em] text-white placeholder:text-white/20 focus:border-accent focus:outline-none"
      />
      {error && <p className="text-danger" role="alert">{error}</p>}
      <button type="submit" className="h-14 rounded-2xl bg-accent text-xl font-bold text-accent-ink">
        Vis kampen
      </button>
    </form>
  );
}
