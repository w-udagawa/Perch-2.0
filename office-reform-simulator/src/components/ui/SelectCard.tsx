import type { ReactNode } from "react";

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  emoji?: string;
  label: ReactNode;
  description?: ReactNode;
  /** 複数選択時のチェック表示 */
  multi?: boolean;
}

export function SelectCard({
  selected,
  onClick,
  emoji,
  label,
  description,
  multi = false,
}: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
        selected
          ? "border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-200"
          : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
      }`}
    >
      {emoji && (
        <span className="text-2xl leading-none" aria-hidden>
          {emoji}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block font-semibold ${
            selected ? "text-brand-800" : "text-slate-700"
          }`}
        >
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-sm text-slate-500">
            {description}
          </span>
        )}
      </span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center text-white transition-all ${
          multi ? "rounded-md" : "rounded-full"
        } ${
          selected
            ? "scale-100 bg-brand-600 opacity-100"
            : "scale-75 bg-slate-200 opacity-0 group-hover:opacity-60"
        }`}
        aria-hidden
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.1-.3z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </button>
  );
}
