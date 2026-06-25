"use client";

import type { ReactNode } from "react";

export function pct(rate: number, digits = 0): string {
  if (!Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

export function num(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export function Panel({
  title,
  emoji,
  description,
  action,
  children,
}: {
  title: string;
  emoji: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <span aria-hidden>{emoji}</span>
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const BAR_COLORS: Record<string, string> = {
  brand: "bg-brand-500",
  emerald: "bg-emerald-500",
  amber: "bg-accent-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
};

/** ラベル付き横棒（fraction は 0..1） */
export function Bar({
  label,
  fraction,
  valueText,
  color = "brand",
  sub,
}: {
  label: ReactNode;
  fraction: number;
  valueText: ReactNode;
  color?: keyof typeof BAR_COLORS;
  sub?: ReactNode;
}) {
  const width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate text-slate-700">{label}</span>
        <span className="shrink-0 font-bold tabular-nums text-slate-800">
          {valueText}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${BAR_COLORS[color]} transition-all`}
          style={{ width }}
        />
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
      {children}
    </p>
  );
}
