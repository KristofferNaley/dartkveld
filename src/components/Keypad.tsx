"use client";
import { useState } from "react";
import { fieldName } from "@/games/core/engine";
import type { Dart, Field, Game, Multiplier } from "@/games/core/types";

const MULT_LABEL: Record<Multiplier, string> = { 1: "Single", 2: "Double", 3: "Triple" };

/**
 * Tastatur uavhengig av dartskive: velg multiplikator, trykk felt. Multiplikatoren
 * går tilbake til single etter hvert kast.
 */
export function Keypad({
  game,
  disabled,
  dartsLeft,
  canUndo,
  onDarts,
  onUndo,
}: {
  game: Game;
  disabled: boolean;
  dartsLeft: number;
  canUndo: boolean;
  onDarts: (darts: Dart[]) => void;
  onUndo: () => void;
}) {
  const [mult, setMult] = useState<Multiplier>(1);
  // Spill der alle treff teller likt (f.eks. Mickey Mouse) trenger ikke multiplikatorvalg
  const hasMultipliers = game.targets.some((f) => game.multipliersFor(f).length > 1);
  // Tre kolonner når feltene går opp (f.eks. 9 felt), ellers fire
  const cols = !hasMultipliers && game.targets.length % 3 === 0 ? 3 : 4;
  const cells = game.targets.length + (hasMultipliers ? 1 : 0); // Bull er dobbel bredde med multiplikatorer
  const missSpan = cols - (cells % cols) || cols;

  const hit = (field: Field) => {
    onDarts([{ field, multiplier: field === 0 ? 1 : mult }]);
    setMult(1);
  };

  return (
    <div className="touch-pad space-y-2.5">
      {hasMultipliers && (
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Multiplikator">
        {([1, 2, 3] as Multiplier[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mult === m}
            disabled={disabled}
            onClick={() => setMult(m === mult ? 1 : m)}
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
      )}

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {game.targets.map((f) => {
          const allowed = game.multipliersFor(f).includes(mult);
          return (
            <button
              key={f}
              type="button"
              disabled={disabled || !allowed}
              onClick={() => hit(f)}
              className={`tabular h-16 rounded-xl border border-line bg-panel-2 text-2xl font-black active:bg-accent active:text-accent-ink disabled:opacity-30 sm:h-20 sm:text-3xl ${
                f === 25 && hasMultipliers ? "col-span-2 text-xl sm:text-2xl" : f === 25 || f > 25 ? "text-xl sm:text-2xl" : ""
              }`}
            >
              {mult === 2 && f !== 25 ? "D" : mult === 3 ? "T" : ""}
              {f === 25 && mult === 2 ? "Bullseye" : fieldName(f)}
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => hit(0)}
          style={{ gridColumn: `span ${missSpan} / span ${missSpan}` }}
          className="h-16 rounded-xl border border-line bg-bg text-xl font-bold text-muted active:bg-line disabled:opacity-30 sm:h-20"
        >
          Bom
        </button>
      </div>

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
