"use client";
import { useState } from "react";
import type { Dart, Multiplier } from "@/games/core/types";

const MULT_LABEL: Record<Multiplier, string> = { 1: "Single", 2: "Double", 3: "Triple" };
const PREFIX: Record<Multiplier, string> = { 1: "", 2: "D", 3: "T" };
const RING_NAME: Record<2 | 3, string> = { 2: "Dobbel", 3: "Trippel" };

/** Tallene som har egne knapper. Alle andre tall (1–14) kan bare treffes som dobbel eller trippel. */
const MAIN_NUMBERS = [20, 19, 18, 17, 16, 15];
const OTHER_NUMBERS = Array.from({ length: 14 }, (_, i) => i + 1);

/** Valgene etter en dobbel/trippel på 15–20: alt på tallet, delt mellom tallet og ringen, eller bare ringen. */
function choices(field: number, mult: 2 | 3): { label: string; hint: string; dart: Dart }[] {
  const ring = RING_NAME[mult];
  const base = { field, multiplier: mult };
  return [
    { label: `${field} ×${mult}`, hint: `${mult} treff på ${field}`, dart: base },
    { label: `${field} ×${mult - 1} + ${ring}`, hint: `${mult - 1} på ${field} og 1 på ${ring}`, dart: { ...base, ring: true, numberMarks: mult - 1 } },
    { label: `Bare ${ring}`, hint: `1 treff på ${ring}`, dart: { ...base, ring: true } },
  ];
}

const key =
  "tabular h-16 rounded-xl border border-line bg-panel-2 text-2xl font-black active:bg-accent active:text-accent-ink disabled:opacity-30 sm:h-20 sm:text-3xl";

/**
 * Tastatur for Mickey Mouse: velg Single/Double/Triple, så tallet pila traff. Valget går
 * tilbake til Single etter hvert kast. Dobbel og trippel på 15–20 gir et ekstra valg:
 * skal pila telle på tallet eller på Dobbel-/Trippel-feltet?
 */
export function Keypad({
  disabled,
  dartsLeft,
  canUndo,
  onDarts,
  onUndo,
}: {
  disabled: boolean;
  dartsLeft: number;
  canUndo: boolean;
  onDarts: (darts: Dart[]) => void;
  onUndo: () => void;
}) {
  const [mult, setMult] = useState<Multiplier>(1);
  const [other, setOther] = useState(false);
  const [pending, setPending] = useState<{ field: number; mult: 2 | 3 } | null>(null);

  const send = (dart: Dart) => {
    onDarts([dart]);
    setMult(1);
    setOther(false);
    setPending(null);
  };

  const pickNumber = (field: number) => {
    if (mult === 1) return send({ field, multiplier: 1 });
    // Tall under 15 er ikke eget felt, så de teller alltid på ringen
    if (field < 15) return send({ field, multiplier: mult });
    setPending({ field, mult });
  };

  const label = (field: number) => `${PREFIX[mult]}${field}`;

  return (
    <div className="touch-pad space-y-2.5">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ring">
        {([1, 2, 3] as Multiplier[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mult === m}
            disabled={disabled}
            onClick={() => {
              setMult(m === mult ? 1 : m);
              setOther(false);
              setPending(null);
            }}
            className={`h-14 rounded-xl border-2 text-lg font-bold transition disabled:opacity-40 ${
              mult === m
                ? m === 1
                  ? "border-white bg-white text-bg"
                  : m === 2
                    ? "border-ok bg-ok text-bg"
                    : "border-danger bg-danger text-white"
                : "border-line bg-panel-2 text-white"
            }`}
          >
            {MULT_LABEL[m]}
          </button>
        ))}
      </div>

      {pending ? (
        <div className="space-y-2.5 rounded-2xl border border-line bg-panel p-3" role="group" aria-label="Hva skal pila telle på?">
          <p className="text-center font-semibold">
            {PREFIX[pending.mult]}
            {pending.field} gir:
          </p>
          <div className="grid gap-2">
            {choices(pending.field, pending.mult).map((c) => (
              <button key={c.label} type="button" className={`${key} !h-auto py-3 text-xl sm:text-2xl`} onClick={() => send(c.dart)}>
                {c.label}
                <span className="block text-sm font-semibold text-muted">{c.hint}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPending(null)} className="h-11 w-full rounded-xl text-muted hover:bg-panel-2">
            Avbryt
          </button>
        </div>
      ) : other ? (
        <div className="space-y-2.5 rounded-2xl border border-line bg-panel p-3">
          <p className="text-center font-semibold">
            {MULT_LABEL[mult]}: hvilket tall? <span className="font-normal text-muted">(teller på {RING_NAME[mult === 3 ? 3 : 2]})</span>
          </p>
          <div className="grid grid-cols-5 gap-2">
            {OTHER_NUMBERS.map((n) => (
              <button key={n} type="button" disabled={disabled} onClick={() => pickNumber(n)} className={`${key} !h-14 !text-xl`}>
                {label(n)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOther(false)} className="h-11 w-full rounded-xl text-muted hover:bg-panel-2">
            Tilbake
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {MAIN_NUMBERS.map((n) => (
            <button key={n} type="button" disabled={disabled} onClick={() => pickNumber(n)} className={key}>
              {label(n)}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || mult === 1}
            onClick={() => setOther(true)}
            className={`${key} !text-base sm:!text-lg`}
            title={mult === 1 ? "Velg Double eller Triple først" : undefined}
          >
            Annet tall
          </button>
          <button type="button" disabled={disabled} onClick={() => send({ field: 25, multiplier: 1 })} className={`${key} !text-xl sm:!text-2xl`}>
            Bull
            <span className="block text-xs font-semibold text-ok">grønn</span>
          </button>
          <button type="button" disabled={disabled} onClick={() => send({ field: 25, multiplier: 2 })} className={`${key} !text-xl sm:!text-2xl`}>
            Bullseye
            <span className="block text-xs font-semibold text-danger">rød</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => send({ field: 0, multiplier: 1 })}
            className="col-span-3 h-16 rounded-xl border border-line bg-bg text-xl font-bold text-muted active:bg-line disabled:opacity-30 sm:h-20"
          >
            Bom
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="h-14 rounded-xl border border-line bg-panel text-lg font-semibold active:bg-line disabled:opacity-30"
        >
          ↶ Angre
        </button>
        <button
          type="button"
          disabled={disabled || dartsLeft === 0}
          onClick={() => onDarts(Array.from({ length: dartsLeft }, () => ({ field: 0, multiplier: 1 as const })))}
          className="h-14 rounded-xl border border-line bg-panel text-lg font-semibold active:bg-line disabled:opacity-30"
        >
          Bom resten ({dartsLeft})
        </button>
      </div>
    </div>
  );
}
