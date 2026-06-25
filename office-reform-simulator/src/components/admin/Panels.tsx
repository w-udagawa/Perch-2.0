"use client";

import type { SurveyResponse } from "@/lib/types";
import {
  summarizeBalance,
  summarizeBattle,
  summarizeShop,
  summarizeStress,
} from "@/lib/analytics";
import { Bar, EmptyHint, Panel, num, pct } from "./primitives";

// ---------------------------------------------------------------------------
// 現状課題スコア
// ---------------------------------------------------------------------------
export function StressPanel({ responses }: { responses: SurveyResponse[] }) {
  const stats = summarizeStress(responses);
  const hasAny = stats.some((s) => s.count > 0);
  return (
    <Panel
      title="現状課題スコア"
      emoji="🩺"
      description="ストレス項目を選んだ人の割合（多いほど全体の課題）"
    >
      {hasAny ? (
        <div className="space-y-0.5">
          {stats.map((s) => (
            <Bar
              key={s.id}
              label={s.label}
              fraction={s.rate}
              valueText={`${s.count}人 (${pct(s.rate)})`}
              color="red"
            />
          ))}
        </div>
      ) : (
        <EmptyHint>まだ課題が選択された回答はありません。</EmptyHint>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// スライダー平均（働き方バランスバー）
// ---------------------------------------------------------------------------
export function BalancePanel({ responses }: { responses: SurveyResponse[] }) {
  const stats = summarizeBalance(responses);
  return (
    <Panel
      title="働き方バランス（平均）"
      emoji="⚖️"
      description="0〜10 の平均。マーカーが全体の理想の重心（左右どちら寄りか）"
    >
      <div className="space-y-4">
        {stats.map((s) => {
          const pos = `${(s.average / 10) * 100}%`;
          return (
            <div key={s.id}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {s.title}
                </span>
                <span className="text-sm font-bold tabular-nums text-brand-700">
                  {num(s.average)}
                  <span className="text-xs font-normal text-slate-400">
                    {" "}
                    / 10
                  </span>
                </span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-brand-100 via-slate-100 to-accent-400/40">
                <div
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-600 bg-white shadow"
                  style={{ left: pos }}
                  aria-hidden
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>0・{s.leftLabel}</span>
                <span>{s.rightLabel}・10</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// 改善コイン配分率 ＋ Round1/Round2 比較
// ---------------------------------------------------------------------------
export function ShopPanel({ responses }: { responses: SurveyResponse[] }) {
  const stats = summarizeShop(responses);
  const maxShare = Math.max(
    0.001,
    ...stats.map((s) => Math.max(s.r1Share, s.r2Share)),
  );
  const hasAny = stats.some((s) => s.r1Total > 0 || s.r2Total > 0);

  return (
    <Panel
      title="改善コイン配分率（Round1 → Round2）"
      emoji="🛒"
      description="Round1=20枚 / Round2=10枚。予算が減っても伸びた項目（▲）が“本命”の優先事項。"
    >
      {hasAny ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              Round1 配分率
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-500" />
              Round2 配分率
            </span>
          </div>
          <div className="space-y-3">
            {stats.map((s) => {
              const delta = s.shareDelta;
              const deltaUp = delta > 0.001;
              const deltaDown = delta < -0.001;
              return (
                <div key={s.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-slate-700">{s.label}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        deltaUp
                          ? "bg-emerald-100 text-emerald-700"
                          : deltaDown
                            ? "bg-slate-100 text-slate-500"
                            : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      {deltaUp ? "▲" : deltaDown ? "▼" : "→"}{" "}
                      {pct(Math.abs(delta), 1)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <MiniBar fraction={s.r1Share / maxShare} color="bg-brand-500" text={pct(s.r1Share, 1)} />
                    <MiniBar fraction={s.r2Share / maxShare} color="bg-accent-500" text={pct(s.r2Share, 1)} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyHint>まだコインが配分された回答はありません。</EmptyHint>
      )}
    </Panel>
  );
}

function MiniBar({
  fraction,
  color,
  text,
}: {
  fraction: number;
  color: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-500">
        {text}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 改革案ごとの 第一希望率 / 許容率 / 避けたい率
// ---------------------------------------------------------------------------
export function BattlePanel({ responses }: { responses: SurveyResponse[] }) {
  const stats = summarizeBattle(responses);
  return (
    <Panel
      title="改革案バトル 結果"
      emoji="⚔️"
      description="案ごとの 第一希望率 / 許容率 / 避けたい率。許容率が高く避けたい率が低い案が“通しやすい”。"
    >
      <div className="space-y-5">
        {stats.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-100 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                {s.emoji}
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-white">
                {s.id}
              </span>
              <span className="font-bold text-slate-800">{s.name}</span>
            </div>
            <Bar
              label="💙 第一希望"
              fraction={s.firstRate}
              valueText={`${s.firstCount}人 (${pct(s.firstRate)})`}
              color="brand"
            />
            <Bar
              label="🙆 許容できる"
              fraction={s.acceptableRate}
              valueText={`${s.acceptableCount}人 (${pct(s.acceptableRate)})`}
              color="emerald"
            />
            <Bar
              label="🙅 避けたい"
              fraction={s.avoidRate}
              valueText={`${s.avoidCount}人 (${pct(s.avoidRate)})`}
              color="red"
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}
