"use client";

import { SelectCard } from "@/components/ui/SelectCard";
import { STRESS_ITEMS } from "@/lib/questions";
import { useSurvey } from "@/lib/store";

export function StressStep() {
  const { draft, toggleStress } = useSurvey();
  const count = draft.stress.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5 text-sm">
        <span className="text-slate-600">当てはまるものをすべて選択</span>
        <span className="font-bold text-brand-700">{count} 件選択中</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {STRESS_ITEMS.map((item) => (
          <SelectCard
            key={item.id}
            multi
            emoji={item.emoji}
            label={item.label}
            selected={draft.stress.includes(item.id)}
            onClick={() => toggleStress(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
