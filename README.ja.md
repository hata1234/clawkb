<p align="center">
  <img src="./public/logo-clawkb-wordmark.png" alt="ClawKB" width="360" />
</p>

# ClawKB

**人間と AI エージェントのコラボレーションのためのナレッジベース。**

ClawKB は人間と AI エージェントがナレッジエントリーを共同作成・検索・管理できるプラットフォームです。クリーンな Web UI とヘッドレス API を提供します。[OpenClaw](https://github.com/openclaw/openclaw) エコシステム向けに設計されていますが、単独でも動作します。

[English](./README.md) | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | 日本語

## スクリーンショット

| ダッシュボード | エントリーエディター | ナレッジグラフ |
|:-:|:-:|:-:|
| ![ダッシュボード](./docs/screenshots/dashboard.png) | ![エントリーエディター](./docs/screenshots/entry-editor.png) | ![ナレッジグラフ](./docs/screenshots/knowledge-graph.png) |

| 検索 (⌘K) | Ask AI (RAG) | BPMN フローエディター |
|:-:|:-:|:-:|
| ![検索](./docs/screenshots/search.png) | ![Ask AI](./docs/screenshots/ask-ai.png) | ![BPMN](./docs/screenshots/bpmn-editor.png) |

| ACL 設定 | 言語切り替え |
|:-:|:-:|
| ![ACL](./docs/screenshots/acl-settings.png) | ![i18n](./docs/screenshots/i18n-switcher.png) |

## 機能

### コア — エントリー
- 📝 **リッチエディタ** — TipTap マークダウンエディタ、ライブプレビュー対応
- 📂 **コレクション** — 階層フォルダツリー構造；エントリーは複数のコレクションに所属可能
- 🏷️ **タグ & ステータス管理** — エントリーライフサイクルのフィルタリング・整理・追跡（new → interested → in_progress → done / dismissed）
- 🔗 **内部リンク** — `[[entry:ID|title]]` Notion スタイルのメンション、`[[` 入力で検索メニューを起動
- 🖼️ **画像添付** — S3 互換オブジェクトストレージ経由でアップロード（MinIO、AWS S3、R2）
- 📋 **メタデータ (JSON)** — エントリーごとのカスタム JSON メタデータ

### 検索 & ディスカバリー
- 🔍 **ハイブリッド検索** — ベクトル検索（pgvector）+ ファジーマッチ（ILIKE）カスケードパイプライン
- ⌘ **クイック検索** — `⌘K` グローバル検索モーダル
- 🕸️ **ナレッジグラフ** — インタラクティブな d3-force 可視化、`/graph`
- 📅 **タイムライン** — エントリーの時系列ビュー、`/timeline`
- 🔙 **バックリンク** — 双方向リンク検出
- 🧲 **関連エントリー** — エンベディングによるセマンティック類似エントリー推薦

### コラボレーション
- 👥 **マルチユーザー認証** — NextAuth.js セッション管理、登録 + ログイン
- 🔒 **登録フロー** — 管理者承認 + メール認証の設定が可能；未確認/未承認/拒否されたアカウントには専用のログインエラーメッセージ
- 🛡️ **ACL 権限システム** — グループベースのコレクションアクセス制御；各コレクションを特定グループに制限可能、ロールは admin/editor/viewer；組み込みグループ：「Everyone」（匿名含む全員）と「Users」（全登録ユーザー）；実効ロール = ユーザーの全グループ中の最高ロール；`User.isAdmin` は全 ACL をバイパス
- 🔐 **機能権限** — グループに boolean トグル：canCreateCollections、canUseRag、canExport、canManageWebhooks；未許可時は UI 要素が非表示、API は 403 を返す
- 👤 **ユーザー管理** — 管理者はエントリー転送（別ユーザーへ再割当て）またはカスケード削除でユーザーを削除可能；エントリー数とコメント数を表示
- 📧 **SMTP メール** — Gmail / カスタム SMTP、パスワードリセットフロー、通知メール配信
- ⏱️ **パスワードリセットのレート制限** — 1メールアドレスにつき15分間に3回まで
- 🔔 **通知システム** — アプリ内通知ベル、SSE リアルタイムプッシュ、未読バッジ、既読マーク
- 💬 **コメント** — エントリーごとのディスカッションスレッド
- 📜 **リビジョン履歴** — 自動バージョニング、インライン差分ビューア付き；任意の2バージョンまたは現在のコンテンツとの比較が可能
- 📊 **アクティビティログ** — CRUD + コメント操作の自動ログ、`/activity`；管理者以外のユーザーはアクセス可能なコレクションのアクティビティのみ閲覧可能
- ⭐ **お気に入り** — エントリーをスター、`/favorites` でクイックアクセス
- 🗑️ **ソフト削除 & ゴミ箱** — 削除されたエントリーはゴミ箱へ；復元または完全削除（管理者）
- 🔗 **共有リンク** — 時間制限付き、パスワード保護付きの共有リンク、ログイン不要でアクセス可能

### AI & エージェント統合
- 🤖 **エージェント対応 REST API** — 30以上のエンドポイント、Bearer Token 認証
- 🔑 **ユーザーごとの API トークン** — 複数トークンの作成と失効
- 📡 **エージェント登録** — `/api/auth/register-agent` によるプログラマティックなエージェントアカウント作成
- 🧠 **RAG クエリ（Ask AI）** — `/api/rag` エンドポイント：ベクトル検索 → LLM 合成、SSE ストリーミング対応；`/rag` チャット UI にソース引用付き
- 🔔 **Webhooks** — HMAC-SHA256 署名イベント配信、3回の指数バックオフリトライ；イベント：entry.created/updated/deleted/restored、comment.created
- 🔌 **Gateway 自動リコール** — OpenClaw Gateway プラグイン、エージェント会話への自動 RAG 注入、送信者ベースの ACL（オーナー：完全リコール / 公開送信者：公開コレクション限定 / 未認証：リコールなし）
- 🐾 **[OpenClaw Skill + プラグイン](https://github.com/hata1234/clawkb-openclaw)** — コンパニオン Skill をインストールして、OpenClaw エージェントがチャットから直接 ClawKB エントリを読み取り・検索・書き込み可能に

### インポート & エクスポート
- 📥 **インポート** — Markdown (.md)、JSON、CSV ファイルの一括インポート、ドラッグ＆ドロップ UI、プレビューテーブル、重複検出（スキップ/上書き/新規作成）；対象コレクションの選択が必要；書き込み可能なコレクションのみ表示；バックエンドで書き込み権限を検証
- 📤 **エクスポート** — CSV、JSON、Markdown、PDF フォーマット、フィルターオプション付き
- 📄 **PDF エクスポート** — マークダウンレンダリング対応フォーマット済み PDF（見出し、リスト、テーブル、コードブロック）、CJK 対応（Noto Sans TC フォント自動ダウンロード）、オプションのパスワード暗号化

### プラグインシステム
- 🔌 **ファイルベースプラグイン** — `plugins/` ディレクトリ、`manifest.json` + `server.mjs`
- フック：`entry.serialize`、`entryCard.render`、`entry.afterQuery`
- 内蔵：backlinks、related-entries、auto-tag、entry-templates、export
- Content Tags フック (`content.tags`) — プラグインが `{{tag:value}}` 構文を登録してインラインレンダリング可能

### BPMN フローデザイナー
- 🔀 **BPMN フローデザイナー** — bpmn-js ベースのフローデザイナー、フルスクリーンエディタ
- 📎 **EntryFlow アタッチメント** — エントリーごとに複数フロー
- 🔗 **インラインレンダリング** — `{{flow:ID}}` 構文でフローを埋め込み

### 文書番号
- 🔢 **自動文書番号** — コレクション接頭辞 + 連番（例：`QP-001`）

### 国際化
- 🌐 **i18n** — 4言語：English、繁體中文、简体中文、日本語（next-intl 使用）
- 🔤 **言語切替** — アプリ内サイドバー言語セレクター、国旗 emoji 付き
- 🔗 **ロケールルーティング** — `/en/`、`/zh-TW/`、`/zh-CN/`、`/ja/` URL プレフィックスルーティング

### UI
- 🌙 **ダークテーマ** — エディトリアルダーク UI、モバイル・デスクトップ対応
- 📊 **ダッシュボード** — チャートと最新エントリー付き統計概要
- ⚙️ **設定** — エントリータイプ、エンベディング、オブジェクトストレージ、ユーザー、プラグイン、権限、Webhooks、RAG などを設定

## 技術スタック

| レイヤー | 選定技術 |
|----------|----------|
| フレームワーク | Next.js 16 (App Router) |
| データベース | PostgreSQL 17+ + [pgvector](https://github.com/pgvector/pgvector) |
| ORM | Prisma |
| エンベディング | 設定可能 — Ollama（bge-m3、nomic-embed 等）、OpenAI、または互換エンドポイント |
| 認証 | NextAuth.js (Credentials) |
| オブジェクトストレージ | S3 互換（MinIO、AWS S3、Cloudflare R2 等） |
| スタイリング | Tailwind CSS + CSS 変数 |
| プロセスマネージャー | PM2 |

## クイックスタート

### 前提条件

- Node.js 20+
- PostgreSQL 17+、[pgvector](https://github.com/pgvector/pgvector) 拡張機能付き
- エンベディングプロバイダー（Ollama、OpenAI、または互換エンドポイント）

### インストール

```bash
git clone https://github.com/openclaw/clawkb.git
cd clawkb

npm install

# 環境変数を設定
cp .env.example .env
# .env を編集してデータベース URL、認証シークレット等を入力

# データベースマイグレーションを実行
npx prisma migrate deploy

# 初期ユーザーを作成
npm run seed

# ビルド & 起動
npm run build
npm start
```

### Docker

```bash
git clone https://github.com/openclaw/clawkb.git
cd clawkb

# （オプション）.env にシークレットを設定 — docker-compose が読み取ります
cp .env.example .env

docker compose up -d
# アプリは http://localhost:3500 （デフォルトユーザー：admin / change-me-on-first-login）
```

### 環境変数

| 変数 | 説明 | 例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 | `postgresql://user@localhost:5432/clawkb` |
| `NEXTAUTH_SECRET` | セッション暗号化シークレット | (ランダム文字列) |
| `NEXTAUTH_URL` | 公開 URL | `https://kb.example.com` |
| `API_TOKEN` | エージェント API 用グローバル Bearer トークン | (ランダム文字列) |
| **エンベディング** | | |
| `EMBEDDING_PROVIDER` | プロバイダータイプ | `ollama` または `openai` |
| `EMBEDDING_URL` | エンベディング API エンドポイント | `http://localhost:11434` |
| `EMBEDDING_MODEL` | モデル名 | `bge-m3` または `text-embedding-3-small` |
| `EMBEDDING_API_KEY` | API キー（OpenAI 必須） | `sk-...` |
| **オブジェクトストレージ（S3 互換）** | | |
| `S3_ENDPOINT` | S3 互換エンドポイント | `minio.example.com` または `s3.amazonaws.com` |
| `S3_ACCESS_KEY` | アクセスキー | |
| `S3_SECRET_KEY` | シークレットキー | |
| `S3_BUCKET` | バケット名 | `clawkb` |
| `S3_PUBLIC_URL` | アップロードファイルの公開 URL プレフィックス | `https://minio.example.com/clawkb` |
| `S3_REGION` | リージョン（AWS S3 必須） | `us-east-1` |

## 設定

ClawKB は組み込みの設定ページ（`/settings`）を提供しています：

- **エントリータイプ** — エントリーカテゴリの追加・名前変更・削除
- **コレクション** — 階層フォルダ構造の管理
- **エンベディング** — Ollama、OpenAI、その他プロバイダーの切替；モデル変更；エンベディング再構築
- **オブジェクトストレージ** — S3 互換ストレージ接続の設定
- **ユーザー** — ユーザーとロールグループの管理（管理者）
- **権限** — きめ細やかな ACL、カスタムグループ
- **API トークン** — ユーザーごとの API トークン作成、エージェントアクセス用
- **プラグイン** — プラグインの有効化/無効化と設定
- **Webhooks** — Webhook エンドポイントの管理と配信履歴の確認
- **RAG / AI** — Ask AI 機能の LLM プロバイダー設定

## API

全 API エンドポイントは `/api/` 配下です。アクセスにはセッション Cookie または `Authorization: Bearer <token>` ヘッダー（グローバル `API_TOKEN` またはユーザーごとのトークン）が必要です。

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| **エントリー** | | |
| `GET` | `/api/entries` | エントリー一覧（タイプ・ステータス・タグでフィルタリング、ページネーション） |
| `POST` | `/api/entries` | エントリー作成（エンベディング自動生成） |
| `GET` | `/api/entries/[id]` | 単一エントリー取得 |
| `PATCH` | `/api/entries/[id]` | エントリーフィールド更新 |
| `DELETE` | `/api/entries/[id]` | エントリーのソフト削除 |
| **検索** | | |
| `POST` | `/api/search` | ハイブリッド検索（ベクトル + ファジー） |
| **RAG** | | |
| `POST` | `/api/rag` | RAG クエリ — ベクトル検索 → LLM 合成（SSE ストリーミング対応） |
| **コレクション** | | |
| `GET` | `/api/collections` | コレクションツリー一覧 |
| `POST` | `/api/collections` | コレクション作成 |
| `PATCH` | `/api/collections/[id]` | コレクション更新 |
| `DELETE` | `/api/collections/[id]` | コレクション削除 |
| **コメント** | | |
| `GET` | `/api/entries/[id]/comments` | エントリーのコメント一覧 |
| `POST` | `/api/entries/[id]/comments` | コメント追加 |
| **インポート** | | |
| `POST` | `/api/import` | エントリーの一括インポート（Markdown、JSON、CSV） |
| **Webhooks** | | |
| `GET` | `/api/webhooks` | Webhook 一覧 |
| `POST` | `/api/webhooks` | Webhook 作成 |
| `PATCH` | `/api/webhooks/[id]` | Webhook 更新 |
| `DELETE` | `/api/webhooks/[id]` | Webhook 削除 |
| `GET` | `/api/webhooks/[id]/deliveries` | Webhook 配信履歴 |
| **お気に入り** | | |
| `GET` | `/api/favorites` | スター付きエントリー一覧 |
| `POST` | `/api/favorites` | エントリーのスター切替 |
| **アクティビティ** | | |
| `GET` | `/api/activity` | アクティビティフィード |
| **ゴミ箱** | | |
| `GET` | `/api/trash` | ソフト削除済みエントリー一覧 |
| `POST` | `/api/trash` | 復元または完全削除 |
| **グラフ** | | |
| `GET` | `/api/graph` | ナレッジグラフデータ |
| **ユーザー & トークン** | | |
| `GET` | `/api/users` | ユーザー一覧（管理者） |
| `GET` | `/api/tokens` | API トークン一覧 |
| `POST` | `/api/tokens` | API トークン作成 |
| `DELETE` | `/api/tokens/[id]` | トークン失効 |
| **プラグイン** | | |
| `GET` | `/api/plugins` | インストール済みプラグイン一覧 |
| `PATCH` | `/api/plugins/[id]` | プラグインの有効化/無効化 |
| **その他** | | |
| `GET` | `/api/stats` | ダッシュボード統計 |
| `GET` | `/api/tags` | 全タグ一覧 |
| `GET` | `/api/settings` | 現在の設定取得 |
| `PATCH` | `/api/settings` | 設定更新 |

### 例：エントリー作成

```bash
curl -X POST http://localhost:3500/api/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "type": "opportunity",
    "source": "nightly-recon",
    "title": "新しい POD プラットフォームを発見",
    "summary": "簡単な概要",
    "content": "完全なマークダウンコンテンツ...",
    "status": "new",
    "tags": ["pod", "automation"]
  }'
```

### 例：検索

```bash
curl -X POST http://localhost:3500/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "受動的収入の自動化"}'
```

### 例：Ask AI（RAG）

```bash
curl -X POST http://localhost:3500/api/rag \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "DGX Spark のセットアップ方法は？", "stream": true}'
```

### 例：インポート

```bash
# JSON インポート
curl -X POST http://localhost:3500/api/import \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F 'files=@entries.json'

# Markdown インポート（複数ファイル）
curl -X POST http://localhost:3500/api/import \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F 'files=@note1.md' -F 'files=@note2.md'
```

## アーキテクチャ

```
ブラウザ/モバイル → リバースプロキシ (Caddy/Nginx) → Next.js :3500 → PostgreSQL + pgvector
                                                          ↑                    ↑
                                                    AI エージェント /     エンベディング
                                                    定期タスク           プロバイダー
                                                    (REST API)          (Ollama / OpenAI)
                                                          ↓
                                                     プラグインシステム
                                                    (backlinks, auto-tag, templates, export, ...)

OpenClaw Gateway ──(clawkb-recall プラグイン)──→ ClawKB API
                                                    ↓
                                               自動 RAG 注入
                                               エージェント会話へ
```

## プラグイン

ClawKB はファイルベースのプラグインシステムをサポートしています。プラグインは `plugins/` ディレクトリに配置し、以下のフックに対応できます：

| フック | 説明 |
|--------|------|
| `entry.serialize` | 送信前に API レスポンスを変更 |
| `entryCard.render` | エントリーカードにバッジ/アイコン/指標を追加 |
| `entry.afterQuery` | バッチクエリ後の後処理 |

### 内蔵プラグイン

| プラグイン | 説明 |
|------------|------|
| `backlinks` | `#id` と `/entries/id` 参照をスキャンし双方向リンクを構築 |
| `related-entries` | エンベディングでセマンティック類似エントリーを発見 |
| `auto-tag` | コンテンツに基づいてタグを提案 |
| `entry-templates` | よく使うエントリータイプの定義済みテンプレート |
| `export` | CSV、JSON、Markdown、PDF エクスポート、CJK 対応とオプション暗号化 |

## ロードマップ

### ✅ 完了
- [x] ACL 権限システム（グループベースのコレクションアクセス制御、admin/editor/viewer ロール + グループごとの機能権限トグル）
- [x] リビジョン差分ビューア（インライン差分 + 現在のコンテンツとの比較）
- [x] RAG クエリエンドポイント + Ask AI チャット UI、ストリーミング対応
- [x] Webhooks、HMAC-SHA256 署名配信
- [x] PDF エクスポート、CJK 対応とパスワード暗号化
- [x] インポート（Markdown / JSON / CSV 一括インポート、プレビュー UI 付き）
- [x] i18n — 4言語（EN / zh-TW / zh-CN / ja）、next-intl ロケールルーティング
- [x] コレクション（階層フォルダ、旧 Type システムを置換）
- [x] 内部リンク（`[[entry:ID|title]]`）
- [x] 共有リンク（時間制限 + パスワード保護）
- [x] Gateway 自動リコールプラグイン、送信者 ACL 対応
- [x] SMTP メールシステム（Gmail / カスタム SMTP、パスワードリセット、通知メール）
- [x] 通知システム（アプリ内ベル + SSE リアルタイムプッシュ + メール配信）
- [x] ACL 統一リファクタリング（グループ × コレクション → ロール、グループごとの機能権限トグル）
- [x] 文書番号テンプレート（自動エントリー番号生成、例：QP-{collection}-{seq:4}）
- [x] グローバルフローティング AI チャットボックス（任意のページから Ask AI にアクセス）
- [x] BPMN フローデザイナー + Content Tag システム（プラグイン `{{tag:value}}` アーキテクチャ）
- [x] コレクションレベル ACL（コレクションごとのグループアクセス制御）
- [x] 機能権限（グループごとのトグル：コレクション作成、RAG、エクスポート、Webhooks）
- [x] ユーザー管理（エントリー転送またはカスケード削除付き管理者削除）
- [x] 登録フロー（管理者承認 + メール認証）
- [x] インポート ACL（書き込み権限検証付きコレクションセレクター）
- [x] アクティビティログ ACL フィルタリング（管理者以外はアクセス可能なコレクションのみ閲覧）

### 🔜 計画中
- [ ] 共同編集（Yjs / Liveblocks）
- [ ] 公開共有モード（公開 slug、ログイン不要）
- [ ] モバイル PWA
- [ ] バッチ操作（複数選択 + 一括アクション）

## ライセンス

本プロジェクトは [GNU Affero General Public License v3.0](./LICENSE) の下でライセンスされています。詳細は [LICENSE](./LICENSE) ファイルを参照してください。

---

人間と AI エージェントが共に構築し、人間と AI エージェントのために。🤖🤝🧑
