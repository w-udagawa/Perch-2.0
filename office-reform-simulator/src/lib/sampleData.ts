// ============================================================================
// デモ用サンプルデータ生成（管理者画面のプレビュー / 動作確認用）
// 本番運用では使わない。乱数で“それっぽい”回答を量産する。
// ============================================================================

import type { SurveyResponse } from "./types";
import { SCHEMA_VERSION } from "./types";
import {
  BALANCE_SLIDERS,
  PROFILE_QUESTIONS,
  REFORM_PLANS,
  SHOP_ITEMS,
  STRESS_ITEMS,
} from "./questions";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function distribute(total: number, itemIds: string[]): Record<string, number> {
  const alloc: Record<string, number> = {};
  // 偏りを出すため、2〜4 項目に集中させがちにする
  const focusCount = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...itemIds].sort(() => Math.random() - 0.5);
  const focus = shuffled.slice(0, focusCount);
  for (let i = 0; i < total; i++) {
    const id = Math.random() < 0.75 ? pick(focus) : pick(itemIds);
    alloc[id] = (alloc[id] ?? 0) + 1;
  }
  return alloc;
}

const FREE_SAMPLES = [
  "午後の会議が多く、集中作業の時間が取れない。",
  "静かに作業できるブースが欲しい。",
  "週2出社くらいがちょうどいい。",
  "通勤時間が長いのでリモートを増やしたい。",
  "雑談の機会が減ってチームの一体感が薄い。",
  "",
  "",
];

export function generateSampleResponses(
  count: number,
  nowMs: number,
): SurveyResponse[] {
  const out: SurveyResponse[] = [];
  for (let i = 0; i < count; i++) {
    const profile: SurveyResponse["profile"] = {};
    for (const q of PROFILE_QUESTIONS) {
      profile[q.key] = pick(q.options).id;
    }

    // ストレスは 1〜5 件
    const stress = [...STRESS_ITEMS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 5))
      .map((s) => s.id);

    const balance: Record<string, number> = {};
    for (const s of BALANCE_SLIDERS) {
      balance[s.id] = Math.floor(Math.random() * 11);
    }

    const itemIds = SHOP_ITEMS.map((s) => s.id);
    const shop = {
      round1: distribute(20, itemIds),
      round2: distribute(10, itemIds),
    };

    const planIds = REFORM_PLANS.map((p) => p.id);
    const shuffledPlans = [...planIds].sort(() => Math.random() - 0.5);
    const firstChoice = shuffledPlans[0];
    const avoid = shuffledPlans[shuffledPlans.length - 1];
    const acceptable = shuffledPlans
      .slice(1, shuffledPlans.length - 1)
      .filter(() => Math.random() < 0.6);

    const submittedMs = nowMs - Math.floor(Math.random() * 14 * 86400_000);

    out.push({
      schemaVersion: SCHEMA_VERSION,
      id: `sample-${nowMs}-${i}`,
      submittedAt: new Date(submittedMs).toISOString(),
      durationSec: 120 + Math.floor(Math.random() * 300),
      profile,
      stress,
      balance,
      shop,
      battle: { firstChoice, acceptable, avoid },
      freeText: {
        topImprovement: pick(FREE_SAMPLES),
        idealOffice: pick(FREE_SAMPLES),
        other: "",
      },
    });
  }
  return out;
}
