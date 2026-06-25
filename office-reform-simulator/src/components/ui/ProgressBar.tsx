"use client";

import { STEPS } from "@/lib/questions";

interface ProgressBarProps {
  current: number;
  onJump?: (index: number) => void;
}

/** ウィザード上部の進捗インジケータ（ステップのドット＋ラベル） */
export function ProgressBar({ current, onJump }: ProgressBarProps) {
  const pct = (current / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* モバイル: コンパクト表示 */}
      <div className="sm:hidden">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            STEP {current + 1} / {STEPS.length}
          </span>
          <span>
            {STEPS[current].emoji} {STEPS[current].title}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* デスクトップ: ステップ一覧 */}
      <ol className="hidden items-center gap-1 sm:flex">
        {STEPS.map((step, i) => {
          const state =
            i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={step.id} className="flex flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => onJump?.(i)}
                disabled={!onJump}
                className="group flex w-full flex-col items-center"
                aria-current={state === "current" ? "step" : undefined}
              >
                <div className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 ${
                      i === 0
                        ? "opacity-0"
                        : i <= current
                          ? "bg-brand-500"
                          : "bg-slate-200"
                    }`}
                  />
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      state === "done"
                        ? "bg-brand-600 text-white"
                        : state === "current"
                          ? "bg-brand-600 text-white ring-4 ring-brand-100"
                          : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span
                    className={`h-0.5 flex-1 ${
                      i === STEPS.length - 1
                        ? "opacity-0"
                        : i < current
                          ? "bg-brand-500"
                          : "bg-slate-200"
                    }`}
                  />
                </div>
                <span
                  className={`mt-1.5 text-center text-[11px] leading-tight ${
                    state === "current"
                      ? "font-bold text-brand-700"
                      : "font-medium text-slate-500"
                  }`}
                >
                  {step.shortLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
