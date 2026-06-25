// ============================================================================
// オフィス改革シミュレーター — 設問・選択肢のマスターデータ
// すべての画面で共有される「コンテンツ定義」をここに集約する。
// ここを編集すれば設問内容を差し替えられる（集計ロジックは id ベースで追従）。
// ============================================================================

export interface CardOption {
  id: string;
  label: string;
  emoji?: string;
  description?: string;
}

/** 単一選択のカード質問（働き方プロフィール用） */
export interface ProfileQuestion {
  /** Profile のキー名と一致させる */
  key:
    | "department"
    | "jobType"
    | "ageGroup"
    | "tenure"
    | "workStyle"
    | "commute";
  title: string;
  options: CardOption[];
}

// ---------------------------------------------------------------------------
// 2. 働き方プロフィール（カード単一選択）
// ---------------------------------------------------------------------------
export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    key: "department",
    title: "所属部署",
    options: [
      { id: "sales", label: "営業", emoji: "🤝" },
      { id: "dev", label: "開発・技術", emoji: "💻" },
      { id: "planning", label: "企画・マーケ", emoji: "💡" },
      { id: "corporate", label: "管理・バックオフィス", emoji: "📊" },
      { id: "support", label: "カスタマーサポート", emoji: "🎧" },
      { id: "other", label: "その他", emoji: "🗂️" },
    ],
  },
  {
    key: "jobType",
    title: "働き方のタイプ",
    options: [
      { id: "ic", label: "個人で進める仕事が多い", emoji: "🧑‍💻" },
      { id: "team", label: "チームで進める仕事が多い", emoji: "👥" },
      { id: "manager", label: "マネジメント中心", emoji: "🧭" },
      { id: "mixed", label: "状況により様々", emoji: "🔀" },
    ],
  },
  {
    key: "ageGroup",
    title: "年代",
    options: [
      { id: "20s", label: "20代", emoji: "🌱" },
      { id: "30s", label: "30代", emoji: "🌿" },
      { id: "40s", label: "40代", emoji: "🌳" },
      { id: "50plus", label: "50代以上", emoji: "🌲" },
    ],
  },
  {
    key: "tenure",
    title: "勤続年数",
    options: [
      { id: "lt1", label: "1年未満", emoji: "🆕" },
      { id: "1to3", label: "1〜3年", emoji: "📗" },
      { id: "3to5", label: "3〜5年", emoji: "📘" },
      { id: "5to10", label: "5〜10年", emoji: "📙" },
      { id: "10plus", label: "10年以上", emoji: "🏅" },
    ],
  },
  {
    key: "workStyle",
    title: "現在の働き方",
    options: [
      { id: "office", label: "ほぼ出社", emoji: "🏢" },
      { id: "hybrid", label: "ハイブリッド", emoji: "🔁" },
      { id: "remote", label: "ほぼリモート", emoji: "🏠" },
    ],
  },
  {
    key: "commute",
    title: "通勤時間（片道）",
    options: [
      { id: "lt30", label: "30分未満", emoji: "🚶" },
      { id: "30to60", label: "30〜60分", emoji: "🚃" },
      { id: "60to90", label: "60〜90分", emoji: "🚆" },
      { id: "gt90", label: "90分以上", emoji: "🛣️" },
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. 現状ストレス診断（複数選択カード）
// ---------------------------------------------------------------------------
export const STRESS_ITEMS: CardOption[] = [
  { id: "commute", label: "通勤がつらい", emoji: "😮‍💨" },
  { id: "meetings", label: "会議が多すぎる", emoji: "📅" },
  { id: "focus", label: "集中できる場所がない", emoji: "🔇" },
  { id: "noise", label: "騒音がうるさい", emoji: "📢" },
  { id: "comm", label: "コミュニケーション不足", emoji: "💬" },
  { id: "overtime", label: "残業が多い", emoji: "🌙" },
  { id: "equipment", label: "PC・設備が古い", emoji: "🖥️" },
  { id: "space", label: "休憩スペースがない", emoji: "☕" },
  { id: "aircon", label: "空調・温度が不快", emoji: "🌡️" },
  { id: "evaluation", label: "評価制度に不満", emoji: "📈" },
  { id: "remote_hard", label: "リモートしづらい", emoji: "🔒" },
  { id: "chores", label: "雑務・事務が多い", emoji: "🧾" },
];

// ---------------------------------------------------------------------------
// 4. 働き方バランスバー（0〜10 スライダー / 両端ラベル付き）
//    0 = 左ラベル寄り、10 = 右ラベル寄り、5 = 中庸。
// ---------------------------------------------------------------------------
export interface BalanceSlider {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
}

export const BALANCE_SLIDERS: BalanceSlider[] = [
  {
    id: "place",
    title: "働く場所",
    leftLabel: "オフィス出社",
    rightLabel: "フルリモート",
  },
  {
    id: "space_type",
    title: "空間のタイプ",
    leftLabel: "静かな個室・ブース",
    rightLabel: "賑やかなオープン",
  },
  {
    id: "collab",
    title: "仕事の進め方",
    leftLabel: "個人作業を重視",
    rightLabel: "チーム協働を重視",
  },
  {
    id: "rule",
    title: "ルールと裁量",
    leftLabel: "明確なルール",
    rightLabel: "個人の裁量",
  },
  {
    id: "time",
    title: "時間の使い方",
    leftLabel: "決まった勤務時間",
    rightLabel: "フレックス・自由",
  },
  {
    id: "challenge",
    title: "仕事の志向",
    leftLabel: "安定・着実",
    rightLabel: "挑戦・変化",
  },
];

// ---------------------------------------------------------------------------
// 5. オフィス改善ショップ（改善コインを配分するアイテム）
// ---------------------------------------------------------------------------
export interface ShopItem extends CardOption {
  category: "space" | "device" | "welfare" | "system";
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "focus_booth", label: "集中ブース設置", emoji: "🧘", category: "space" },
  { id: "meeting_room", label: "会議室・WEB会議室を増設", emoji: "🪑", category: "space" },
  { id: "lounge", label: "休憩・リフレッシュ空間", emoji: "🛋️", category: "space" },
  { id: "free_address", label: "フリーアドレス化", emoji: "🔄", category: "space" },
  { id: "nap", label: "仮眠スペース", emoji: "😴", category: "space" },
  { id: "device", label: "最新PC・大型モニター", emoji: "🖥️", category: "device" },
  { id: "tool", label: "業務ツール・SaaS拡充", emoji: "🛠️", category: "device" },
  { id: "remote_aid", label: "リモートワーク手当", emoji: "🏠", category: "welfare" },
  { id: "cafe", label: "ドリンク・軽食無料", emoji: "🥤", category: "welfare" },
  { id: "gym", label: "運動・健康支援", emoji: "🏃", category: "welfare" },
  { id: "learning", label: "研修・学習支援", emoji: "📚", category: "system" },
  { id: "flex", label: "フレックス・時短拡大", emoji: "⏰", category: "system" },
];

/** Round ごとの配分コイン総数 */
export const SHOP_ROUNDS = [
  {
    key: "round1" as const,
    title: "Round 1",
    subtitle: "潤沢な予算があったら？",
    coins: 20,
    description: "改善コインを 20 枚、欲しい改善に自由に配分してください。",
  },
  {
    key: "round2" as const,
    title: "Round 2",
    subtitle: "もし予算が半分（コイン10枚）だったら？",
    coins: 10,
    description:
      "予算が限られたとき、本当に優先したい改善はどれ？ 10 枚で配分してください。",
  },
];

// ---------------------------------------------------------------------------
// 6. 改革案バトル（A〜D の改革案を比較）
// ---------------------------------------------------------------------------
export interface ReformPlan {
  id: string; // "A" | "B" | "C" | "D"
  name: string;
  emoji: string;
  tagline: string;
  pros: string[];
  cons: string[];
}

export const REFORM_PLANS: ReformPlan[] = [
  {
    id: "A",
    name: "フルリモート＆オフィス縮小",
    emoji: "🏠",
    tagline: "出社は原則任意。オフィスは最小限に。",
    pros: ["通勤ストレスゼロ", "住む場所が自由", "集中しやすい"],
    cons: ["雑談・連携が減る", "新人の育成が難しい", "孤独感"],
  },
  {
    id: "B",
    name: "出社回帰＆コラボ強化",
    emoji: "🏢",
    tagline: "原則出社。対面のコラボレーションを最大化。",
    pros: ["連携・一体感", "育成しやすい", "オン/オフ切替"],
    cons: ["通勤負担", "集中時間の確保", "柔軟性が下がる"],
  },
  {
    id: "C",
    name: "ハイブリッド＆フリーアドレス",
    emoji: "🔁",
    tagline: "週数日出社。席は自由、用途で空間を使い分け。",
    pros: ["柔軟性が高い", "用途別に最適化", "バランス型"],
    cons: ["運用が複雑", "中途半端になりがち", "席取り問題"],
  },
  {
    id: "D",
    name: "成果主義＆フルフレックス",
    emoji: "🎯",
    tagline: "働く時間・場所は不問。成果で評価。",
    pros: ["完全な自由", "生産性で評価", "ライフに合わせやすい"],
    cons: ["自己管理が必須", "評価設計が難しい", "つながりが薄れる"],
  },
];

// ---------------------------------------------------------------------------
// ステップ定義（ウィザードの順序とラベル）
// ---------------------------------------------------------------------------
import type { StepId } from "./types";

export interface StepMeta {
  id: StepId;
  /** 進捗バーに表示する短いラベル */
  shortLabel: string;
  /** 画面タイトル */
  title: string;
  emoji: string;
}

export const STEPS: StepMeta[] = [
  { id: "welcome", shortLabel: "はじめに", title: "ようこそ", emoji: "👋" },
  { id: "profile", shortLabel: "プロフィール", title: "働き方プロフィール", emoji: "🪪" },
  { id: "stress", shortLabel: "ストレス診断", title: "現状ストレス診断", emoji: "🩺" },
  { id: "balance", shortLabel: "バランス", title: "働き方バランスバー", emoji: "⚖️" },
  { id: "shop", shortLabel: "改善ショップ", title: "オフィス改善ショップ", emoji: "🛒" },
  { id: "battle", shortLabel: "改革案バトル", title: "改革案バトル", emoji: "⚔️" },
  { id: "freetext", shortLabel: "自由記述", title: "自由記述", emoji: "✍️" },
  { id: "review", shortLabel: "確認・送信", title: "回答の確認・送信", emoji: "📤" },
];

// ---------------------------------------------------------------------------
// id → ラベル の逆引きヘルパー（集計画面・確認画面で使用）
// ---------------------------------------------------------------------------
export function labelForProfile(key: ProfileQuestion["key"], id?: string): string {
  if (!id) return "—";
  const q = PROFILE_QUESTIONS.find((p) => p.key === key);
  return q?.options.find((o) => o.id === id)?.label ?? id;
}

export function labelForStress(id: string): string {
  return STRESS_ITEMS.find((s) => s.id === id)?.label ?? id;
}

export function labelForShopItem(id: string): string {
  return SHOP_ITEMS.find((s) => s.id === id)?.label ?? id;
}

export function labelForBalance(id: string): string {
  return BALANCE_SLIDERS.find((b) => b.id === id)?.title ?? id;
}

export function reformPlan(id?: string): ReformPlan | undefined {
  return REFORM_PLANS.find((p) => p.id === id);
}
