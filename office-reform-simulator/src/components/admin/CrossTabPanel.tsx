"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { SurveyResponse } from "@/lib/types";
import { crossTabBalance, crossTabFirstChoice } from "@/lib/analytics";
import { BALANCE_SLIDERS, PROFILE_QUESTIONS, REFORM_PLANS } from "@/lib/questions";
import type { ProfileQuestion } from "@/lib/questions";
import { EmptyHint, Panel, num, pct } from "./primitives";

/** 平均値(0..10)を左=青 / 右=橙 のセル背景色にマップ */
function balanceCellStyle(avg: number): CSSProperties {
  if (!Number.isFinite(avg)) return { background: "transparent" };
  const t = (avg - 5) / 5; // -1..1
  const intensity = Math.min(1, Math.abs(t)) * 0.5;
  const color =
    t < 0
      ? `rgba(37, 99, 235, ${intensity})` // brand-600
      : `rgba(245, 158, 11, ${intensity})`; // accent-500
  return { background: color };
}

export function CrossTabPanel({
  responses,
}: {
  responses: SurveyResponse[];
}) {
  const [key, setKey] = useState<ProfileQuestion["key"]>("department");

  const fc = crossTabFirstChoice(responses, key);
  const bal = crossTabBalance(responses, key);
  const hasGroups = fc.groups.length > 0;

  return (
    <Panel
      title="属性別クロス集計"
      emoji="🔬"
      description="属性ごとに「第一希望の改革案」と「働き方バランス平均」を比較。"
      action={
        <select
          value={key}
          onChange={(e) => setKey(e.target.value as ProfileQuestion["key"])}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
          aria-label="集計する属性"
        >
          {PROFILE_QUESTIONS.map((q) => (
            <option key={q.key} value={q.key}>
              {q.title}
            </option>
          ))}
        </select>
      }
    >
      {!hasGroups ? (
        <EmptyHint>回答がありません。</EmptyHint>
      ) : (
        <div className="space-y-8">
          {/* 改革案 第一希望 クロス */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-700">
              × 改革案 第一希望（人数 / グループ内%）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 pr-3 font-medium">属性</th>
                    <th className="px-2 py-2 text-right font-medium">n</th>
                    {REFORM_PLANS.map((p) => (
                      <th
                        key={p.id}
                        className="px-2 py-2 text-center font-medium"
                        title={p.name}
                      >
                        {p.emoji} {p.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fc.groups.map((g, gi) => {
                    const row = fc.rows[gi];
                    const max = Math.max(...REFORM_PLANS.map((p) => row[p.id]));
                    return (
                      <tr
                        key={g.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-2 pr-3 font-medium text-slate-700">
                          {g.label}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                          {g.responses.length}
                        </td>
                        {REFORM_PLANS.map((p) => {
                          const c = row[p.id];
                          const isMax = c > 0 && c === max;
                          return (
                            <td
                              key={p.id}
                              className={`px-2 py-2 text-center tabular-nums ${
                                isMax
                                  ? "rounded bg-brand-50 font-bold text-brand-700"
                                  : "text-slate-600"
                              }`}
                            >
                              {c > 0 ? (
                                <>
                                  {c}
                                  <span className="ml-1 text-[10px] text-slate-400">
                                    {pct(c / g.responses.length)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-300">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* バランス平均 クロス */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-700">
              × 働き方バランス平均（0=左ラベル / 10=右ラベル）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 pr-3 font-medium">属性</th>
                    {BALANCE_SLIDERS.map((s) => (
                      <th
                        key={s.id}
                        className="px-2 py-2 text-center font-medium"
                        title={`${s.leftLabel} ↔ ${s.rightLabel}`}
                      >
                        {s.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bal.groups.map((g, gi) => {
                    const row = bal.rows[gi];
                    return (
                      <tr
                        key={g.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-2 pr-3 font-medium text-slate-700">
                          {g.label}
                        </td>
                        {BALANCE_SLIDERS.map((s) => {
                          const v = row[s.id];
                          return (
                            <td
                              key={s.id}
                              className="px-2 py-2 text-center tabular-nums text-slate-700"
                              style={balanceCellStyle(v)}
                            >
                              {Number.isFinite(v) ? num(v) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              青いほど左ラベル寄り、オレンジほど右ラベル寄り。各列ヘッダにカーソルを合わせると両端ラベルが表示されます。
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}
