# オフィス改革シミュレーター 🏢

部員が**職場環境で何を重視し / 何を軽視し / どの改革案なら受け入れられるか**を、
ゲーム感覚で回答できる社内アンケート Web アプリ。
**Next.js (App Router) + TypeScript + Tailwind CSS** で実装。

> このアプリは同リポジトリの音声検出アプリ「Perch 2.0」とは独立した、
> `office-reform-simulator/` 配下の単体プロジェクトです。

---

## できること

### 回答フロー（9 画面）

| # | 画面 | 内容 / 主な UI |
|---|------|----------------|
| 1 | Welcome | アンケートの説明・所要時間・開始 |
| 2 | 働き方プロフィール | 部署 / 年代 / 働き方などを**カード単一選択** |
| 3 | 現状ストレス診断 | 課題を**カード複数選択** |
| 4 | 働き方バランスバー | 6 軸を **0〜10 のスライダー**で（両端ラベル付き） |
| 5 | オフィス改善ショップ | **改善コイン配分 UI**（Round1=20枚 / Round2=10枚） |
| 6 | 改革案バトル | 改革案 **A〜D を比較**し「第一希望 / 許容 / 避けたい」を選択 |
| 7 | 自由記述 | テキスト 3 項目（すべて任意） |
| 8 | 回答確認・送信 | 入力サマリ→送信→**JSON 書き出し** |
| 9 | 管理者用集計画面 | 複数回答 JSON を読み込み**集計・分析・CSV/JSON 出力** |

### 集計・分析（`/admin`）

- **現状課題スコア**（ストレス項目ごとの選択率）
- **スライダー平均**（働き方バランスの重心）
- **改善コイン配分率**と **Round1 → Round2 比較**
  （予算が減っても伸びた項目＝“本命”の優先事項を可視化）
- **改革案ごとの第一希望率 / 許容率 / 避けたい率**
- **属性別クロス集計**（部署・年代・働き方 ×（改革案 / バランス平均））
- **CSV / JSON エクスポート**、回答 JSON のインポート（複数ファイル統合）

---

## データ保存（MVP）

- 回答は**ブラウザの localStorage にのみ保存**（サーバー送信なし）。
- 回答完了時に **1 名分の JSON** を書き出して提出する運用。
- 集計担当者は `/admin` で**複数名の JSON をまとめて読み込み**、集計できる。
  （`id` が重複する回答は後勝ちで統合）

回答 JSON の形（1 名分・抜粋）:

```json
{
  "schemaVersion": 1,
  "id": "…",
  "submittedAt": "2026-06-25T03:04:05.678Z",
  "durationSec": 214,
  "profile": { "department": "dev", "ageGroup": "30s", "workStyle": "hybrid" },
  "stress": ["meetings", "focus"],
  "balance": { "place": 8, "collab": 6 },
  "shop": { "round1": { "focus_booth": 8 }, "round2": { "focus_booth": 6 } },
  "battle": { "firstChoice": "C", "acceptable": ["A", "B"], "avoid": "D" },
  "freeText": { "topImprovement": "…", "idealOffice": "…", "other": "" }
}
```

`/admin` からのエクスポートは、上記回答の配列を包んだエンベロープ形式:

```json
{ "kind": "office-reform-simulator/responses", "schemaVersion": 1,
  "exportedAt": "…", "count": 25, "responses": [ /* SurveyResponse[] */ ] }
```

インポート時は **エンベロープ / 素の配列 / 単一オブジェクト**のいずれも受け付けます。

---

## 開発・実行

```bash
cd office-reform-simulator
npm install
npm run dev      # http://localhost:3000

# 本番ビルド
npm run build
npm start
```

要件: Node.js 18.18+（推奨 20 / 22）。

---

## 構成

```
office-reform-simulator/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx            # 回答ウィザード（/）
│  │  ├─ admin/page.tsx      # 管理者用集計画面（/admin）
│  │  ├─ layout.tsx, globals.css, icon.svg
│  ├─ components/
│  │  ├─ ui/                 # Button, SelectCard, BalanceSliderInput, CoinStepper, ProgressBar
│  │  ├─ survey/             # 各ステップ + SurveyWizard + SubmittedScreen
│  │  └─ admin/              # AdminDashboard, Panels, CrossTabPanel, primitives
│  └─ lib/
│     ├─ types.ts            # 型定義
│     ├─ questions.ts        # 設問・選択肢マスター（ここを編集すれば内容差し替え）
│     ├─ store.tsx           # 状態管理（Context）+ localStorage 永続化
│     ├─ storage.ts          # localStorage I/O
│     ├─ analytics.ts        # 集計ロジック（純粋関数）
│     ├─ export.ts           # CSV/JSON 入出力
│     └─ sampleData.ts       # デモ用サンプル生成
└─ package.json, tsconfig.json, tailwind.config.ts, …
```

### 設問内容のカスタマイズ

設問・選択肢・改革案・改善アイテムはすべて
[`src/lib/questions.ts`](src/lib/questions.ts) に集約しています。
ここを編集すれば、集計ロジック（`analytics.ts`）は **id ベースで自動的に追従**します。

---

## 設計メモ

- 集計はすべてクライアント内の純粋関数。サーバー・DB なしで完結（MVP）。
- 回答途中の入力は自動保存され、再訪時に再開できる。
- 「デモデータ」ボタンで 24 件のサンプルを生成し、集計画面を即プレビュー可能。

## 今後の拡張案

- バックエンド保存（送信 API / DB）と回答のリアルタイム集約
- 集計結果のグラフ画像 / PDF 出力
- 設問の出し分け・分岐、必須バリデーション強化
- 多言語対応
