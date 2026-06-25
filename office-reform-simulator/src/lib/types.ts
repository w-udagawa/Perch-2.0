// ============================================================================
// オフィス改革シミュレーター — 型定義
// ============================================================================

/** 各画面（ステップ）の識別子 */
export type StepId =
  | "welcome"
  | "profile"
  | "stress"
  | "balance"
  | "shop"
  | "battle"
  | "freetext"
  | "review";

/** 働き方プロフィール（カード選択・単一選択の集合） */
export interface Profile {
  /** 部署 */
  department?: string;
  /** 職種 */
  jobType?: string;
  /** 年代 */
  ageGroup?: string;
  /** 勤続年数 */
  tenure?: string;
  /** 現在の働き方（出社/リモート/ハイブリッド） */
  workStyle?: string;
  /** 通勤時間 */
  commute?: string;
}

/** 現状ストレス診断（複数選択した課題カードの id 配列） */
export type StressSelection = string[];

/**
 * 働き方バランスバー（0〜10 のスライダー）。
 * key はスライダー id、value は 0〜10 の整数。
 */
export type BalanceValues = Record<string, number>;

/** 改善コインの配分。key は改善アイテム id、value は配分枚数。 */
export type CoinAllocation = Record<string, number>;

/** オフィス改善ショップ（2 ラウンド分の配分） */
export interface ShopData {
  /** Round 1: 20 枚配分（潤沢な予算） */
  round1: CoinAllocation;
  /** Round 2: 10 枚配分（予算が半分になったら） */
  round2: CoinAllocation;
}

/** 改革案バトル（A〜D の比較選択） */
export interface BattleChoice {
  /** 第一希望の改革案 id（A〜D のいずれか 1 つ） */
  firstChoice?: string;
  /** 許容できる改革案 id の配列（複数可） */
  acceptable: string[];
  /** 最も避けたい改革案 id（1 つ） */
  avoid?: string;
}

/** 自由記述 */
export interface FreeText {
  /** 一番改善してほしいこと */
  topImprovement?: string;
  /** 理想の働き方・オフィス像 */
  idealOffice?: string;
  /** その他自由記述 */
  other?: string;
}

/** 1 名分の回答データ（保存・エクスポートの単位） */
export interface SurveyResponse {
  /** スキーマバージョン（将来の互換性のため） */
  schemaVersion: number;
  /** 一意な回答 id */
  id: string;
  /** 送信日時（ISO 8601） */
  submittedAt: string;
  /** 回答に要した秒数（概算） */
  durationSec?: number;
  profile: Profile;
  stress: StressSelection;
  balance: BalanceValues;
  shop: ShopData;
  battle: BattleChoice;
  freeText: FreeText;
}

/** 回答途中の作業状態（localStorage に保存する下書き） */
export interface SurveyDraft {
  schemaVersion: number;
  /** 回答開始日時（ISO 8601） */
  startedAt: string;
  profile: Profile;
  stress: StressSelection;
  balance: BalanceValues;
  shop: ShopData;
  battle: BattleChoice;
  freeText: FreeText;
}

export const SCHEMA_VERSION = 1;
