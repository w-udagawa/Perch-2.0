"use client";

import type { CSSProperties } from "react";

interface BalanceSliderInputProps {
  title: string;
  leftLabel: string;
  rightLabel: string;
  value: number | undefined;
  onChange: (value: number) => void;
}

/** 0〜10 の両端ラベル付きスライダー。未回答時は中央(5)を薄く表示。 */
export function BalanceSliderInput({
  title,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: BalanceSliderInputProps) {
  const touched = typeof value === "number";
  const current = touched ? value! : 5;
  const fill = `${(current / 10) * 100}%`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <span
          className={`flex h-8 w-10 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${
            touched
              ? "bg-brand-100 text-brand-700"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {touched ? current : "–"}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ors-range"
        style={{ "--ors-fill": fill } as CSSProperties}
        aria-label={`${title}: ${leftLabel} から ${rightLabel}`}
        aria-valuetext={touched ? String(current) : "未回答"}
      />

      <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
        <span className="max-w-[45%] text-left">{leftLabel}</span>
        <span className="max-w-[45%] text-right">{rightLabel}</span>
      </div>
    </div>
  );
}
