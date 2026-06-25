"use client";

import { REFORM_PLANS } from "@/lib/questions";
import { useSurvey } from "@/lib/store";
import type { BattleChoice } from "@/lib/types";

type Stance = "first" | "acceptable" | "avoid" | "none";

const STANCE_META: {
  key: Exclude<Stance, "none">;
  label: string;
  active: string;
  idle: string;
}[] = [
  {
    key: "first",
    label: "💙 第一希望",
    active: "bg-brand-600 text-white border-brand-600",
    idle: "border-slate-300 text-slate-600 hover:border-brand-400",
  },
  {
    key: "acceptable",
    label: "🙆 許容できる",
    active: "bg-emerald-600 text-white border-emerald-600",
    idle: "border-slate-300 text-slate-600 hover:border-emerald-400",
  },
  {
    key: "avoid",
    label: "🙅 避けたい",
    active: "bg-red-600 text-white border-red-600",
    idle: "border-slate-300 text-slate-600 hover:border-red-400",
  },
];

const CARD_BY_STANCE: Record<Stance, string> = {
  first: "border-brand-500 ring-1 ring-brand-200 bg-brand-50/40",
  acceptable: "border-emerald-400 bg-emerald-50/40",
  avoid: "border-red-300 bg-red-50/40",
  none: "border-slate-200 bg-white",
};

function getStance(battle: BattleChoice, planId: string): Stance {
  if (battle.firstChoice === planId) return "first";
  if (battle.avoid === planId) return "avoid";
  if (battle.acceptable.includes(planId)) return "acceptable";
  return "none";
}

export function BattleStep() {
  const { draft, setBattle } = useSurvey();
  const battle = draft.battle;

  function apply(planId: string, next: Stance) {
    let first = battle.firstChoice;
    let acc = battle.acceptable.filter((id) => id !== planId);
    let avoid = battle.avoid;
    if (first === planId) first = undefined;
    if (avoid === planId) avoid = undefined;

    if (next === "first") first = planId;
    else if (next === "acceptable") acc = [...acc, planId];
    else if (next === "avoid") avoid = planId;

    setBattle({ firstChoice: first, acceptable: acc, avoid });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        4 つの改革案を比較し、それぞれに態度を選んでください。
        <span className="font-semibold text-brand-700">第一希望は 1 つ</span>、
        <span className="font-semibold text-emerald-700">許容は複数可</span>、
        <span className="font-semibold text-red-700">避けたいは 1 つ</span>です。
      </div>

      {REFORM_PLANS.map((plan) => {
        const stance = getStance(battle, plan.id);
        return (
          <div
            key={plan.id}
            className={`rounded-2xl border-2 p-4 transition-colors ${CARD_BY_STANCE[stance]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none" aria-hidden>
                {plan.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-white">
                    {plan.id}
                  </span>
                  <h3 className="font-bold text-slate-800">{plan.name}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ul className="space-y-1 text-xs text-emerald-700">
                    {plan.pros.map((p) => (
                      <li key={p} className="flex gap-1">
                        <span aria-hidden>＋</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-1 text-xs text-red-600">
                    {plan.cons.map((c) => (
                      <li key={c} className="flex gap-1">
                        <span aria-hidden>−</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {STANCE_META.map((s) => {
                const isActive = stance === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => apply(plan.id, isActive ? "none" : s.key)}
                    aria-pressed={isActive}
                    className={`rounded-xl border-2 px-2 py-2 text-xs font-bold transition-colors ${
                      isActive ? s.active : s.idle
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
