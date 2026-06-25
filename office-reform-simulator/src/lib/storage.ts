// ============================================================================
// localStorage 永続化レイヤ（MVP のデータ保存）
// SSR 安全のため、すべて typeof window ガードを入れている。
// ============================================================================

import type { SurveyDraft, SurveyResponse } from "./types";
import { SCHEMA_VERSION } from "./types";

export const DRAFT_KEY = "ors:draft:v1";
export const RESPONSES_KEY = "ors:responses:v1";

const isBrowser = () => typeof window !== "undefined";

/** 空の下書きを生成（開始日時のみ呼び出し時に確定させたいので引数で受ける） */
export function emptyDraft(startedAt: string): SurveyDraft {
  return {
    schemaVersion: SCHEMA_VERSION,
    startedAt,
    profile: {},
    stress: [],
    balance: {},
    shop: { round1: {}, round2: {} },
    battle: { acceptable: [] },
    freeText: {},
  };
}

export function loadDraft(): SurveyDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SurveyDraft;
    // 最低限の形チェック（壊れたデータは破棄）
    if (!parsed || typeof parsed !== "object" || !parsed.shop) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: SurveyDraft): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 容量超過などは黙ってスキップ（MVP）
  }
}

export function clearDraft(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function loadResponses(): SurveyResponse[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(RESPONSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SurveyResponse[]) : [];
  } catch {
    return [];
  }
}

export function saveResponses(list: SurveyResponse[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(RESPONSES_KEY, JSON.stringify(list));
  } catch {
    // noop
  }
}

/** 回答を 1 件追記して、保存後の一覧を返す */
export function appendResponse(res: SurveyResponse): SurveyResponse[] {
  const list = loadResponses();
  const next = [...list, res];
  saveResponses(next);
  return next;
}
