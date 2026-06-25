// ============================================================================
// CSV / JSON のエクスポート & インポート
// ============================================================================

import type { SurveyResponse } from "./types";
import { SCHEMA_VERSION } from "./types";
import {
  BALANCE_SLIDERS,
  PROFILE_QUESTIONS,
  SHOP_ITEMS,
  STRESS_ITEMS,
  labelForProfile,
  reformPlan,
} from "./questions";

export const EXPORT_KIND = "office-reform-simulator/responses";

export interface ExportEnvelope {
  kind: typeof EXPORT_KIND;
  schemaVersion: number;
  exportedAt: string;
  count: number;
  responses: SurveyResponse[];
}

// ---------------------------------------------------------------------------
// ブラウザでファイルとしてダウンロード
// ---------------------------------------------------------------------------
export function downloadBlob(content: string, filename: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // クリック直後に revoke するとブラウザによってはDLが中断されるため遅延させる
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export function timestampSlug(iso: string): string {
  // 2026-06-25T03:04:05.678Z -> 20260625-030405
  return iso.replace(/[-:T]/g, "").replace(/\..+$/, "").slice(0, 15);
}

// ---------------------------------------------------------------------------
// JSON エクスポート
// ---------------------------------------------------------------------------
export function buildEnvelope(
  responses: SurveyResponse[],
  exportedAt: string,
): ExportEnvelope {
  return {
    kind: EXPORT_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    count: responses.length,
    responses,
  };
}

export function responsesToJson(
  responses: SurveyResponse[],
  exportedAt: string,
): string {
  return JSON.stringify(buildEnvelope(responses, exportedAt), null, 2);
}

/** 1 件分（回答完了画面でのダウンロード用） */
export function singleResponseToJson(res: SurveyResponse): string {
  return JSON.stringify(res, null, 2);
}

// ---------------------------------------------------------------------------
// CSV ユーティリティ
// ---------------------------------------------------------------------------
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const head = headers.map(csvCell).join(",");
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  // Excel での文字化け回避に UTF-8 BOM を付与
  return "﻿" + head + "\r\n" + body;
}

// ---------------------------------------------------------------------------
// 生回答のワイド CSV（1 行 = 1 回答、分析しやすい横持ち）
// ---------------------------------------------------------------------------
export function responsesToCsv(responses: SurveyResponse[]): string {
  const headers: string[] = [
    "id",
    "submittedAt",
    "durationSec",
    ...PROFILE_QUESTIONS.map((q) => `profile_${q.key}`),
    ...STRESS_ITEMS.map((s) => `stress_${s.id}`),
    ...BALANCE_SLIDERS.map((b) => `balance_${b.id}`),
    ...SHOP_ITEMS.map((s) => `r1_${s.id}`),
    ...SHOP_ITEMS.map((s) => `r2_${s.id}`),
    "battle_first",
    "battle_acceptable",
    "battle_avoid",
    "free_topImprovement",
    "free_idealOffice",
    "free_other",
  ];

  const rows: (string | number)[][] = responses.map((r) => {
    const cells: (string | number)[] = [
      r.id,
      r.submittedAt,
      r.durationSec ?? "",
    ];
    for (const q of PROFILE_QUESTIONS) {
      cells.push(labelForProfile(q.key, r.profile[q.key]));
    }
    for (const s of STRESS_ITEMS) cells.push(r.stress.includes(s.id) ? 1 : 0);
    for (const b of BALANCE_SLIDERS) cells.push(r.balance[b.id] ?? "");
    for (const s of SHOP_ITEMS) cells.push(r.shop.round1[s.id] ?? 0);
    for (const s of SHOP_ITEMS) cells.push(r.shop.round2[s.id] ?? 0);
    cells.push(reformPlan(r.battle.firstChoice)?.name ?? "");
    cells.push(r.battle.acceptable.map((id) => reformPlan(id)?.name ?? id).join(" / "));
    cells.push(reformPlan(r.battle.avoid)?.name ?? "");
    cells.push(r.freeText.topImprovement ?? "");
    cells.push(r.freeText.idealOffice ?? "");
    cells.push(r.freeText.other ?? "");
    return cells;
  });

  return toCsv(headers, rows);
}

// ---------------------------------------------------------------------------
// インポート（複数 JSON ファイルの読み込み）
// 受け付ける形式:
//   1) ExportEnvelope（{ kind, responses: [...] }）
//   2) SurveyResponse[]（素の配列）
//   3) SurveyResponse（単一オブジェクト）
// ---------------------------------------------------------------------------
export interface ParseResult {
  responses: SurveyResponse[];
  errors: string[];
}

function looksLikeResponse(x: unknown): x is SurveyResponse {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    "profile" in o &&
    "stress" in o &&
    "shop" in o &&
    "battle" in o
  );
}

/** 不足フィールドを補完して安全な SurveyResponse にする */
function normalize(x: SurveyResponse): SurveyResponse {
  return {
    schemaVersion: x.schemaVersion ?? SCHEMA_VERSION,
    id: x.id ?? `imported-${Math.random().toString(36).slice(2, 10)}`,
    submittedAt: x.submittedAt ?? "",
    durationSec: x.durationSec,
    profile: x.profile ?? {},
    stress: Array.isArray(x.stress) ? x.stress : [],
    balance: x.balance ?? {},
    shop: {
      round1: x.shop?.round1 ?? {},
      round2: x.shop?.round2 ?? {},
    },
    battle: {
      firstChoice: x.battle?.firstChoice,
      acceptable: Array.isArray(x.battle?.acceptable)
        ? x.battle.acceptable
        : [],
      avoid: x.battle?.avoid,
    },
    freeText: x.freeText ?? {},
  };
}

export function parseResponsesText(text: string, filename = ""): ParseResult {
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { responses: [], errors: [`${filename}: JSON として解析できませんでした`] };
  }

  let candidates: unknown[] = [];
  if (Array.isArray(data)) {
    candidates = data;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.responses)) {
      candidates = obj.responses;
    } else if (looksLikeResponse(data)) {
      candidates = [data];
    } else {
      errors.push(`${filename}: 回答データが見つかりませんでした`);
    }
  } else {
    errors.push(`${filename}: 未対応の形式です`);
  }

  const responses: SurveyResponse[] = [];
  for (const c of candidates) {
    if (looksLikeResponse(c)) {
      responses.push(normalize(c));
    } else {
      errors.push(`${filename}: 不正な回答レコードをスキップしました`);
    }
  }
  return { responses, errors };
}

/** id 重複を除去してマージ（後勝ち） */
export function mergeUnique(
  existing: SurveyResponse[],
  incoming: SurveyResponse[],
): SurveyResponse[] {
  const map = new Map<string, SurveyResponse>();
  for (const r of existing) map.set(r.id, r);
  for (const r of incoming) map.set(r.id, r);
  return Array.from(map.values());
}
