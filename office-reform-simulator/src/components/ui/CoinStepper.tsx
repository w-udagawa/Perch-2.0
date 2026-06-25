"use client";

interface CoinStepperProps {
  emoji?: string;
  label: string;
  value: number;
  /** これ以上増やせない（残コインが 0） */
  atMax: boolean;
  onInc: () => void;
  onDec: () => void;
}

/** 改善コインを 1 枚ずつ増減するカード（オフィス改善ショップ用） */
export function CoinStepper({
  emoji,
  label,
  value,
  atMax,
  onInc,
  onDec,
}: CoinStepperProps) {
  const active = value > 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition-colors ${
        active ? "border-accent-400 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      {emoji && (
        <span className="text-2xl leading-none" aria-hidden>
          {emoji}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold leading-snug text-slate-700">
          {label}
        </p>
        <div className="mt-1 flex items-center gap-1" aria-hidden>
          {value > 0 ? (
            <div className="flex flex-wrap gap-0.5">
              {Array.from({ length: Math.min(value, 20) }).map((_, i) => (
                <span
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-accent-500"
                />
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400">コインを配分</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onDec}
          disabled={value === 0}
          aria-label={`${label} を 1 枚減らす`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="w-7 text-center text-lg font-bold tabular-nums text-slate-800">
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={atMax}
          aria-label={`${label} を 1 枚増やす`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-lg font-bold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          +
        </button>
      </div>
    </div>
  );
}
