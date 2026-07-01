---
title: Perch 2.0 Wildlife Audio Detector
emoji: 🐦
colorFrom: green
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# Perch 2.0 — 音声生息生物検出 Web アプリ

Google DeepMind の生物音響基盤モデル **[Perch 2.0](https://github.com/google-research/perch-hoplite)** を使い、
アップロードした音声から**鳥類・陸上生物の種を検出**する Web アプリ。
音声を 5 秒窓に区切り、各窓ごとに種と確信度を返します。

> **実現可能性の結論: 十分に可能。**
> Perch 2.0 は **Apache 2.0** のオープンソースで、内蔵の約 15,000 種分類ヘッドをそのまま使えるため、
> 鳥類・陸上生物が対象なら**追加学習なしで**動作します。本リポジトリはその実装一式です。

---

## できること / アーキテクチャ

```
[ブラウザ] --音声(WAV/FLAC/OGG/MP3/M4A)--> [FastAPI] --32kHz mono 5秒窓--> [Perch 2.0]
    ^                                                                  |
    └── 種名・時間帯・確信度(JSON) ◄── 学名整形 ◄── sigmoid(logits) ◄──┘
```

- **バックエンド**: FastAPI。起動時にモデルを 1 回ロードして再利用（TF はスレッド非安全なため lock でシリアライズ）。
- **音声処理**: `soundfile`(libsndfile 同梱) + `soxr` で 32 kHz モノラルへ統一。
- **フロントエンド**: 素の HTML/JS（ビルド不要）。アップロード → 種一覧テーブル + 5 秒窓タイムライン + 該当時刻へシークできる音声プレイヤー。
- **モデル**: Perch 2.0（`perch-hoplite` の `load_model_by_name('perch_v2')`）。入力 5 秒 / 32 kHz、出力は約 14,797 クラスのマルチラベル・スコア。

---

## クイックスタート

### 1. モック・モード（モデル DL 不要・すぐ動く）

実モデルの重みをダウンロードせず、パイプライン全体を確認できます（ラベルはデモ用のダミー）。

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PERCH_MOCK=1 uvicorn backend.main:app --reload
# → http://127.0.0.1:8000 を開く
```

### 2. 本番モード（実 Perch 2.0）

`perch-hoplite[tf]` を追加で入れ、**Kaggle にアクセスできる環境**で実行します。

```bash
pip install -r requirements.txt -r requirements-model.txt
python scripts/download_model.py        # 重みを事前DL・疎通確認（任意）
uvicorn backend.main:app                # PERCH_MOCK は付けない
```

初回起動時に Kaggle Models から重みが `~/.cache/kagglehub/` にダウンロードされます。

Web を立てずに**コマンドラインで識別**することもできます（実モデル / モック共通）:

```bash
python scripts/classify.py recording.wav                 # 実モデル
python scripts/classify.py --top-k 8 a.mp3 b.flac        # 複数ファイル・上位8件
PERCH_MOCK=1 python scripts/classify.py sample.wav       # モック
```

---

## デプロイ（Web 公開）

本番用の `Dockerfile` / `docker-compose.yml` を同梱しています。**1 イメージで実モデル・モックの両対応**（`PERCH_MOCK` で切替）。サーバーは `$PORT`（既定 `7860`）を尊重します。

```bash
docker compose up --build        # → http://localhost:7860（実モデル）
```

プラットフォーム別の手順（**Hugging Face Spaces / Docker・VPS / Cloud Run / Render・Railway**）は **[DEPLOY.md](DEPLOY.md)** を参照。

- 無料で実モデルを公開するなら **Hugging Face Spaces（Docker SDK）** が最適（無料 CPU 枠でも 16 GB RAM）。本 `README.md` 冒頭のフロントマターを HF がそのまま読み取ります。
- 実モデルは **RAM 2–3 GB** と初回の Kaggle 重み DL（388 MB）が必要。`KAGGLEHUB_CACHE` に永続ボリュームを当てると再 DL を回避できます。

---

## ⚠️ ネットワーク要件（重要）

実モデルの重みは **Kaggle Models から取得**します。`pip` のパッケージ取得とは別に、
実行環境から **kaggle.com への HTTPS アクセスが必要**です。

- 既定の**サンドボックス実行環境では Kaggle への egress が組織ポリシーで遮断**されています。
  ネットワークポリシーで `kaggle.com` と `storage.googleapis.com`（または `*.googleapis.com`）を許可すれば、
  実モデルが匿名ダウンロードで動作します（公開モデルのため認証は不要なことが多い）。許可しない場合は
  **モック・モード**で全パイプライン（アップロード→デコード→窓→スコア→API→UI）を確認できます。
- **オフライン / 制限環境での実モデル運用**: Kaggle にアクセスできる別マシンで
  `python scripts/download_model.py` を実行し、生成された `~/.cache/kagglehub/` を
  実行環境にコピーすれば、`load_model_by_name('perch_v2')` がそのキャッシュを使ってオフラインで動作します
  （`KAGGLEHUB_CACHE` 環境変数でキャッシュ位置を指定可）。
- Kaggle 認証が要求される場合は `KAGGLE_USERNAME` / `KAGGLE_KEY`（または `~/.kaggle/kaggle.json`）を設定してください。

---

## API

| Method | Path | 説明 |
|---|---|---|
| `GET` | `/api/health` | バックエンド種別・クラス数・入力仕様 |
| `POST` | `/api/predict` | `multipart/form-data` で音声を送信。クエリ `top_k`(1–20) / `threshold`(0–1) 任意 |
| `GET` | `/` | フロントエンド（静的配信） |

`/api/predict` レスポンス例:

```json
{
  "duration_sec": 27.4,
  "sample_rate": 32000,
  "window_seconds": 5.0,
  "n_windows": 6,
  "backend": "perch-hoplite",
  "summary": [
    {"class_id": "Buteo buteo", "scientific_name": "Buteo buteo",
     "common_name": "ノスリ", "max_score": 0.9998, "max_logit": 8.77, "n_windows": 2}
  ],
  "windows": [
    {"index": 0, "start": 0.0, "end": 5.0, "detections": [
      {"class_id": "Buteo buteo", "scientific_name": "Buteo buteo",
       "common_name": "ノスリ", "score": 0.9998, "logit": 8.77}
    ]}
  ]
}
```

`summary` は `max_logit` の降順。`score` は sigmoid 確率で、確信度の高い種は 1.0 付近に飽和するため、**順位付け・表示の主指標は `logit`**（生のロジット）です。

---

## 設定（環境変数）

| 変数 | 既定 | 説明 |
|---|---|---|
| `PERCH_MOCK` | `0` | `1` でモック・モード（重み不要） |
| `PERCH_MODEL_NAME` | `perch_v2` | perch-hoplite のプリセット名（`perch_v2_cpu` 等） |
| `PERCH_TOP_K` | `5` | 各 5 秒窓で返す上位種数 |
| `PERCH_THRESHOLD` | `0.1` | 表示する確信度の下限 |
| `PERCH_MAX_UPLOAD_MB` | `50` | アップロード上限 |

---

## テスト

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest          # モック・モードで完結（DL 不要）
```

---

## 制限事項・今後の拡張

- **対象**: 鳥類・陸上生物。海洋生物（クジラ等）は内蔵ヘッド非対応 → embeddings + カスタム学習（perch-hoplite のアジャイルモデリング）で拡張可能。
- **音声形式**: WAV/FLAC/OGG/AIFF/**MP3** は libsndfile で対応（ffmpeg 不要）。**M4A/AAC/MP4**（iPhone 録音など）は **ffmpeg フォールバック**で対応します（Docker イメージに ffmpeg を同梱。ffmpeg が無い環境ではその旨の明確なエラーを返します）。
- **ラベル**: 学名（iNaturalist）。**和名**は日本で観察されやすい主要種を `backend/wamei.py` に同梱し「種」列に表示します（未収録種は学名のまま／英名はモック時のみ）。
- **スコア**: 各検出は生の `logit` と sigmoid 確率 `score` の両方を返します。確信度の高い種は sigmoid が 1.0 付近に飽和して見分けがつかないため、**順位付け・表示は `logit`**（summary は `max_logit` 降順）。`score` は較正済みの絶対確率ではないので、しきい値はデータに応じて調整してください。
- **実行時に要確認**（実モデル接続時）: logits dict のキー名、活性化の有無、出力テンソルの channel 軸形状。コードは `next(iter(...))`・`squeeze` で防御的に処理しています。

## ライセンス

アプリのコードは本リポジトリのライセンスに従います。Perch 2.0 モデルおよび `perch-hoplite` は **Apache-2.0**。
