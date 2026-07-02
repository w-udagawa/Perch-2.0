# デプロイ手順 — Perch 2.0 Web アプリ

FastAPI（バックエンド）+ 静的フロントを 1 つの Docker イメージにまとめてデプロイします。
**1 イメージで実モデル / モックの両対応**（環境変数で切替）です。

## まず要件の確認

| モード | 起動方法 | メモリ | 初回ネットワーク | ラベル |
|---|---|---|---|---|
| **実 Perch 2.0**（既定） | そのまま起動 | **~2–3 GB** | Kaggle から重み 388 MB を DL | 本物の約 15,000 種 |
| **モック** | `PERCH_MOCK=1` | ~256 MB | 不要 | ダミー（デモ用） |

- 実モデルは初回起動時に `kagglehub` が重みを `$KAGGLEHUB_CACHE`（コンテナ内 `/home/app/.cache/kagglehub`）へ DL します。**そのパスに永続ボリュームをマウント**すれば再起動時の再 DL を避けられます。
- CPU 実行なので GPU は不要。イメージ既定は CPU 版 `perch_v2_cpu`。
- **対応音声形式**: WAV/FLAC/OGG/AIFF/MP3 に加え、**M4A/AAC/MP4**（iPhone 録音など）・**WebM**（ブラウザ内蔵の録音機能が生成）も対応。イメージに `ffmpeg` を同梱しているため追加設定は不要です。
- **ブラウザ内録音機能**（🎙 その場で録音）は `getUserMedia`/`MediaRecorder` を使うため、**HTTPS**（または `localhost`）配信が必須です。Hugging Face Spaces / Cloud Run / Render 等の HTTPS 配信では問題なく動作します。

---

## 選択肢 A: Hugging Face Spaces（★推奨・無料枠で実モデルが動く）

無料 CPU Space でも **2 vCPU / 16 GB RAM** あり、実 Perch 2.0 が動きます。公開 URL が即発行されます。

1. https://huggingface.co/new-space で Space を作成
   - **SDK: Docker**（Blank / 空テンプレート）
   - Hardware: **CPU basic（無料）**
2. この Space の Git リポジトリに本リポジトリの中身を push します（`Dockerfile` と、フロントマターを含む `README.md` が必須）。

   ```bash
   # 既存リポジトリを Space の remote に push する例
   git remote add space https://huggingface.co/spaces/<user>/<space-name>
   git push space claude/trusting-thompson-rjmwtt:main
   ```

   > `README.md` 冒頭の YAML フロントマター（`sdk: docker` / `app_port: 7860`）を HF が読み取り、自動でビルド・起動します。
3. ビルド後、初回アクセス時に重みを DL するため数分かかります（ログに `Model ready: backend=perch-hoplite` と出れば準備完了）。

**永続化（任意・再起動時の再 DL 回避）**: Space の Settings → **Persistent storage** を有効にし、`KAGGLEHUB_CACHE` を永続パス（例 `/data/kagglehub`）に向けます。Settings → Variables に `KAGGLEHUB_CACHE=/data/kagglehub` を追加。

---

## 選択肢 A-2: GitHub Actions で HF Space へ自動デプロイ

`.github/workflows/deploy-hf-space.yml` を同梱しています。トークンをローカルにも
チャットにも出さず、**GitHub の暗号化 Secret** 経由で HF Space へ push します。

**セットアップ（初回のみ）**

1. HF で Space を作成（SDK = Docker / Hardware = CPU basic）。
2. HF で **fine-grained トークン**を発行し、権限は**その 1 Space に write のみ**へスコープ。
3. GitHub リポジトリ → **Settings → Secrets and variables → Actions**:
   - **Secret**: `HF_TOKEN` = 発行したトークン
   - **Variable**: `HF_SPACE_ID` = `<HFユーザー名>/<space-name>`

**実行**

- **手動**: Actions タブ → *Deploy to Hugging Face Space* → **Run workflow**。
  （このボタンはワークフローが**デフォルトブランチ**にある場合に表示されます）
- **自動**: ブランチ `claude/trusting-thompson-rjmwtt` への push で発火。Secret/Variable
  設定後に、失敗している run を **Re-run** すればそのままデプロイされます。

ワークフローは公式 Action（`actions/checkout` / `setup-python`）のみを使い、トークンは
`huggingface_hub` が**環境変数から**読み取ります（コマンド引数に出ないためログに漏れません）。

---

## 選択肢 B: Docker（自前サーバー / VPS / Fly.io など）

`docker compose` が一番簡単です。

```bash
docker compose up --build
# → http://localhost:7860
```

`compose` を使わない場合:

```bash
docker build -t perch-2.0 .
docker run -p 7860:7860 \
  -v perch-model-cache:/home/app/.cache/kagglehub \
  perch-2.0
```

- **モックで軽く動かす**: `-e PERCH_MOCK=1`（ボリューム不要）。
- **VPS 要件**: 実モデルは RAM 3 GB 以上を推奨（TF + モデル）。スワップのみだと初回ロードが遅くなります。
- **Fly.io**: `fly launch`（Dockerfile 自動検出）→ `fly.toml` の `[[vm]]` を `memory = "4gb"` に、`internal_port = 7860` に設定 → `fly deploy`。重み永続化に fly volume を `/home/app/.cache/kagglehub` へマウント。

---

## 選択肢 C: Google Cloud Run

サーバーレス・ゼロスケール。スケールイン→アウトのたびに重みを再 DL しないよう、**ビルド時に重みを焼き込む**のがおすすめです。

```bash
# 重みをイメージに同梱してビルド（ビルド時に Kaggle egress が必要）
gcloud builds submit --tag gcr.io/<PROJECT>/perch \
  --machine-type=e2-highcpu-8

# ↑ Cloud Build で BAKE を効かせたい場合はローカルで：
#   docker build --build-arg BAKE_MODEL=true -t gcr.io/<PROJECT>/perch .
#   docker push gcr.io/<PROJECT>/perch

gcloud run deploy perch \
  --image gcr.io/<PROJECT>/perch \
  --memory 4Gi --cpu 2 \
  --timeout 300 \
  --allow-unauthenticated
```

- Cloud Run は `$PORT`（既定 8080）を注入します。イメージはこれを尊重するので追加設定不要。
- `--memory 4Gi` 以上を推奨（TF + モデル）。`--cpu 2` 以上で推論が速くなります。
- 重みを焼き込まない場合は最小インスタンス `--min-instances 1` で常時起動にし、コールドスタート時の再 DL を避けてください。

---

## 選択肢 D: Render / Railway

GitHub 連携で Dockerfile から自動デプロイできます。

- **Render**: New → Web Service → リポジトリ選択 → Runtime **Docker**。無料プランは 512 MB で実モデルには**不足**するため、**Standard（2 GB+）以上**が必要。Disk を追加し `/home/app/.cache/kagglehub` にマウントで重み永続化。ヘルスチェックパス `/api/health`。
- **Railway**: New Project → Deploy from Repo（Dockerfile 検出）。Variables に `PERCH_MODEL_NAME=perch_v2_cpu`。Volume を `/home/app/.cache/kagglehub` にマウント。実モデルは 8 GB プランが安全。
- どちらもポートは自動注入の `$PORT` を尊重します。

---

## 環境変数

| 変数 | 既定 | 説明 |
|---|---|---|
| `PORT` | `7860` | 待受ポート（各 PaaS が上書き注入） |
| `PERCH_MOCK` | `0` | `1` でモック（重み不要・軽量） |
| `PERCH_MODEL_NAME` | `perch_v2_cpu` | perch-hoplite プリセット（GPU は `perch_v2`） |
| `PERCH_TOP_K` | `5` | 各 5 秒窓で返す上位種数 |
| `PERCH_THRESHOLD` | `0.1` | 表示する確信度の下限 |
| `PERCH_MAX_UPLOAD_MB` | `50` | アップロード上限 |
| `KAGGLEHUB_CACHE` | `/home/app/.cache/kagglehub` | 重みキャッシュ先（永続ボリュームの向け先） |

---

## トラブルシューティング

- **起動が遅い / 最初のリクエストが返らない**: 実モデルは起動時に重みを DL し TF を初期化します（初回は数分）。ログに `Model ready` が出るまで待つか、重みを焼き込む（選択肢 C）か永続ボリュームを使ってください。
- **`Failed to load Perch model … kaggle.com`**: 実行環境から `kaggle.com` / `*.googleapis.com` への HTTPS egress が必要です。閉域なら別環境で `python scripts/download_model.py` を実行して `kagglehub` キャッシュをボリュームにコピーしてください。
- **OOM で落ちる**: RAM 不足。実モデルは 3 GB 以上を割り当ててください（無料 512 MB 系は不可）。とりあえず動作確認だけなら `PERCH_MOCK=1`。
- **MP3 が 400 になる**: 想定外です。イメージは `soundfile` 同梱の libsndfile で MP3 を解釈します。`libsndfile1` を別途 apt 導入すると MPEG 非対応版に上書きされる場合があるため、Dockerfile では導入していません。
- **M4A/AAC が「ffmpeg backend が無い」エラー**: m4a は libsndfile では読めず ffmpeg にフォールバックします。提供の Dockerfile は `ffmpeg` を同梱済みですが、自前ビルドで apt の `ffmpeg` を外すと m4a が使えなくなります（WAV/MP3 等は影響なし）。
- **「🎙 その場で録音」ボタンが使えない/マイク許可が出ない**: `getUserMedia`/`MediaRecorder` はブラウザのセキュアコンテキスト要件により **HTTPS（または `localhost`）でのみ動作**します。HTTP で自前配信している場合はリバースプロキシ等で TLS を終端してください（HF Spaces / Cloud Run / Render は既定で HTTPS のため対象外）。
