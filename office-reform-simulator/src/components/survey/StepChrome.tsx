"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function StepHeader({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
        <span aria-hidden>{emoji}</span>
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      )}
    </header>
  );
}

export function StepNav({
  onBack,
  onNext,
  nextLabel = "次へ",
  backLabel = "戻る",
  nextDisabled = false,
  hint,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  hint?: ReactNode;
}) {
  return (
    <div className="mt-8 border-t border-slate-200 pt-5">
      {hint && (
        <p className="mb-3 text-center text-xs text-slate-500">{hint}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          ← {backLabel}
        </Button>
        <Button onClick={onNext} disabled={nextDisabled}>
          {nextLabel} →
        </Button>
      </div>
    </div>
  );
}
