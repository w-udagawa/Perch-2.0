// ============================================================================
// 集計・分析ロジック（管理者用集計画面で使用）
// すべて純粋関数。SurveyResponse[] を入力に集計結果を返す。
// ============================================================================

import type { SurveyResponse } from "./types";
import {
  BALANCE_SLIDERS,
  PROFILE_QUESTIONS,
  REFORM_PLANS,
  SHOP_ITEMS,
  STRESS_ITEMS,
  labelForProfile,
} from "./questions";
import type { ProfileQuestion } from "./questions";

export function safeRate(num: number, denom: number): number {
  return denom > 0 ? num / denom : 0;
}

// ---------------------------------------------------------------------------
// 現状課題スコア（ストレス項目ごとの選択率）
// ---------------------------------------------------------------------------
export interface CountStat {
  id: string;
  label: string;
  count: number;
  rate: number; // 0..1（回答者に占める割合）
}

export function summarizeStress(responses: SurveyResponse[]): CountStat[] {
  const n = responses.length;
  return STRESS_ITEMS.map((item) => {
    const count = responses.filter((r) => r.stress.includes(item.id)).length;
    return { id: item.id, label: item.label, count, rate: safeRate(count, n) };
  }).sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// 働き方バランスバー（スライダー平均）
// ---------------------------------------------------------------------------
export interface BalanceStat {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  average: number; // 0..10
  count: number; // 回答数
}

export function summarizeBalance(responses: SurveyResponse[]): BalanceStat[] {
  return BALANCE_SLIDERS.map((slider) => {
    const values = responses
      .map((r) => r.balance[slider.id])
      .filter((v): v is number => typeof v === "number");
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      id: slider.id,
      title: slider.title,
      leftLabel: slider.leftLabel,
      rightLabel: slider.rightLabel,
      average: values.length ? sum / values.length : 5,
      count: values.length,
    };
  });
}

// ---------------------------------------------------------------------------
// 改善コイン配分率 ＋ Round1/Round2 比較
// ---------------------------------------------------------------------------
export interface ShopStat {
  id: string;
  label: string;
  r1Total: number;
  r1Share: number; // そのラウンドの総コインに占める割合 0..1
  r1Avg: number; // 回答者 1 人あたりの平均配分枚数
  r2Total: number;
  r2Share: number;
  r2Avg: number;
  /** R2 シェア − R1 シェア。プラスなら「予算が減っても優先された」 */
  shareDelta: number;
}

export function summarizeShop(responses: SurveyResponse[]): ShopStat[] {
  const n = responses.length;
  const r1Grand = responses.reduce(
    (acc, r) => acc + sumCoins(r.shop.round1),
    0,
  );
  const r2Grand = responses.reduce(
    (acc, r) => acc + sumCoins(r.shop.round2),
    0,
  );

  return SHOP_ITEMS.map((item) => {
    const r1Total = responses.reduce(
      (acc, r) => acc + (r.shop.round1[item.id] ?? 0),
      0,
    );
    const r2Total = responses.reduce(
      (acc, r) => acc + (r.shop.round2[item.id] ?? 0),
      0,
    );
    const r1Share = safeRate(r1Total, r1Grand);
    const r2Share = safeRate(r2Total, r2Grand);
    return {
      id: item.id,
      label: item.label,
      r1Total,
      r1Share,
      r1Avg: safeRate(r1Total, n),
      r2Total,
      r2Share,
      r2Avg: safeRate(r2Total, n),
      shareDelta: r2Share - r1Share,
    };
  }).sort((a, b) => b.r1Total - a.r1Total);
}

function sumCoins(alloc: Record<string, number>): number {
  return Object.values(alloc).reduce((a, b) => a + (b || 0), 0);
}

// ---------------------------------------------------------------------------
// 改革案ごとの 第一希望率 / 許容率 / 避けたい率
// ---------------------------------------------------------------------------
export interface BattleStat {
  id: string;
  name: string;
  emoji: string;
  firstCount: number;
  firstRate: number;
  acceptableCount: number;
  acceptableRate: number;
  avoidCount: number;
  avoidRate: number;
  /** 第一希望 ＋ 許容 を「受け入れ可能」とみなした率 */
  netAcceptRate: number;
}

export function summarizeBattle(responses: SurveyResponse[]): BattleStat[] {
  const n = responses.length;
  return REFORM_PLANS.map((plan) => {
    const firstCount = responses.filter(
      (r) => r.battle.firstChoice === plan.id,
    ).length;
    const acceptableCount = responses.filter((r) =>
      r.battle.acceptable.includes(plan.id),
    ).length;
    const avoidCount = responses.filter(
      (r) => r.battle.avoid === plan.id,
    ).length;
    // 第一希望は当然「受け入れ可能」に含める
    const netAccept = responses.filter(
      (r) =>
        r.battle.firstChoice === plan.id ||
        r.battle.acceptable.includes(plan.id),
    ).length;
    return {
      id: plan.id,
      name: plan.name,
      emoji: plan.emoji,
      firstCount,
      firstRate: safeRate(firstCount, n),
      acceptableCount,
      acceptableRate: safeRate(acceptableCount, n),
      avoidCount,
      avoidRate: safeRate(avoidCount, n),
      netAcceptRate: safeRate(netAccept, n),
    };
  });
}

// ---------------------------------------------------------------------------
// 属性別クロス集計
// ---------------------------------------------------------------------------
export interface Group {
  id: string; // 属性値の id（"sales" 等）。未回答は "__none__"
  label: string;
  responses: SurveyResponse[];
}

export function groupByProfile(
  responses: SurveyResponse[],
  key: ProfileQuestion["key"],
): Group[] {
  const q = PROFILE_QUESTIONS.find((p) => p.key === key);
  const buckets = new Map<string, SurveyResponse[]>();
  for (const r of responses) {
    const id = r.profile[key] ?? "__none__";
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id)!.push(r);
  }
  // マスター定義の順序を尊重しつつ、未回答は最後に
  const ordered: Group[] = [];
  for (const opt of q?.options ?? []) {
    const rs = buckets.get(opt.id);
    if (rs && rs.length) {
      ordered.push({ id: opt.id, label: opt.label, responses: rs });
      buckets.delete(opt.id);
    }
  }
  for (const [id, rs] of Array.from(buckets.entries())) {
    ordered.push({
      id,
      label: id === "__none__" ? "未回答" : labelForProfile(key, id),
      responses: rs,
    });
  }
  return ordered;
}

/** 属性グループ × 改革案 第一希望 のクロス集計（行=属性, 列=改革案） */
export interface CrossTabFirstChoice {
  key: ProfileQuestion["key"];
  groups: Group[];
  /** rows[groupIndex][planId] = 第一希望にした人数 */
  rows: Record<string, number>[];
}

export function crossTabFirstChoice(
  responses: SurveyResponse[],
  key: ProfileQuestion["key"],
): CrossTabFirstChoice {
  const groups = groupByProfile(responses, key);
  const rows = groups.map((g) => {
    const row: Record<string, number> = {};
    for (const plan of REFORM_PLANS) {
      row[plan.id] = g.responses.filter(
        (r) => r.battle.firstChoice === plan.id,
      ).length;
    }
    return row;
  });
  return { key, groups, rows };
}

/** 属性グループ × バランススライダー平均 のクロス集計 */
export interface CrossTabBalance {
  key: ProfileQuestion["key"];
  groups: Group[];
  /** rows[groupIndex][sliderId] = 平均値 (0..10) */
  rows: Record<string, number>[];
}

export function crossTabBalance(
  responses: SurveyResponse[],
  key: ProfileQuestion["key"],
): CrossTabBalance {
  const groups = groupByProfile(responses, key);
  const rows = groups.map((g) => {
    const row: Record<string, number> = {};
    for (const slider of BALANCE_SLIDERS) {
      const vals = g.responses
        .map((r) => r.balance[slider.id])
        .filter((v): v is number => typeof v === "number");
      row[slider.id] = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : NaN;
    }
    return row;
  });
  return { key, groups, rows };
}

// ---------------------------------------------------------------------------
// 全体サマリ（ダッシュボード見出し用）
// ---------------------------------------------------------------------------
export interface Overview {
  total: number;
  avgDurationSec: number | null;
  topStress: CountStat | null;
  topReform: BattleStat | null;
  mostAvoided: BattleStat | null;
}

export function overview(responses: SurveyResponse[]): Overview {
  const total = responses.length;
  const durations = responses
    .map((r) => r.durationSec)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const stress = summarizeStress(responses);
  const battle = summarizeBattle(responses);
  const topReform =
    [...battle].sort((a, b) => b.firstCount - a.firstCount)[0] ?? null;
  const mostAvoided =
    [...battle].sort((a, b) => b.avoidCount - a.avoidCount)[0] ?? null;
  return {
    total,
    avgDurationSec: durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null,
    topStress: stress[0] ?? null,
    topReform: topReform && topReform.firstCount > 0 ? topReform : null,
    mostAvoided: mostAvoided && mostAvoided.avoidCount > 0 ? mostAvoided : null,
  };
}
