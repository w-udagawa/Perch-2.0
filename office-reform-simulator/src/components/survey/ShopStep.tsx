"use client";

import { useState } from "react";
import { CoinStepper } from "@/components/ui/CoinStepper";
import { Button } from "@/components/ui/Button";
import { SHOP_ITEMS, SHOP_ROUNDS } from "@/lib/questions";
import { useSurvey } from "@/lib/store";

export function ShopStep() {
  const { draft, setCoin, resetRound } = useSurvey();
  const [active, setActive] = useState<"round1" | "round2">("round1");

  const round = SHOP_ROUNDS.find((r) => r.key === active)!;
  const alloc = draft.shop[active];
  const spent = Object.values(alloc).reduce((a, b) => a + (b || 0), 0);
  const remaining = round.coins - spent;
  const atMax = remaining <= 0;

  return (
    <div>
      {/* ラウンド切替 */}
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
        {SHOP_ROUNDS.map((r) => {
          const rSpent = Object.values(draft.shop[r.key]).reduce(
            (a, b) => a + (b || 0),
            0,
          );
          const isActive = active === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setActive(r.key)}
              className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "bg-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div
                className={`text-sm font-bold ${
                  isActive ? "text-brand-700" : ""
                }`}
              >
                {r.title}
                <span className="ml-1 font-normal text-slate-400">
                  ({r.coins}枚)
                </span>
              </div>
              <div className="text-[11px] leading-tight text-slate-500">
                {rSpent}/{r.coins} 配分済み
              </div>
            </button>
          );
        })}
      </div>

      {/* コイン残高バナー */}
      <div className="sticky top-2 z-10 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs font-medium text-amber-700">
            {round.subtitle}
          </p>
          <p className="text-sm text-slate-600">{round.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-extrabold tabular-nums text-amber-600">
            🪙 {remaining}
          </div>
          <div className="text-[11px] text-slate-500">残りコイン</div>
        </div>
      </div>

      {atMax && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
          ✓ {round.coins} 枚すべて配分しました（増やすには他を減らしてください）
        </p>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SHOP_ITEMS.map((item) => (
          <CoinStepper
            key={item.id}
            emoji={item.emoji}
            label={item.label}
            value={alloc[item.id] ?? 0}
            atMax={atMax}
            onInc={() => setCoin(active, item.id, (alloc[item.id] ?? 0) + 1)}
            onDec={() => setCoin(active, item.id, (alloc[item.id] ?? 0) - 1)}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resetRound(active)}
          disabled={spent === 0}
        >
          このラウンドをリセット
        </Button>
      </div>
    </div>
  );
}
