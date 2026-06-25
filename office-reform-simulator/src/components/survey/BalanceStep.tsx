"use client";

import { BalanceSliderInput } from "@/components/ui/BalanceSliderInput";
import { BALANCE_SLIDERS } from "@/lib/questions";
import { useSurvey } from "@/lib/store";

export function BalanceStep() {
  const { draft, setBalance } = useSurvey();

  return (
    <div className="space-y-3">
      {BALANCE_SLIDERS.map((slider) => (
        <BalanceSliderInput
          key={slider.id}
          title={slider.title}
          leftLabel={slider.leftLabel}
          rightLabel={slider.rightLabel}
          value={draft.balance[slider.id]}
          onChange={(v) => setBalance(slider.id, v)}
        />
      ))}
    </div>
  );
}
