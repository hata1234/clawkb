<p align="center">
  <img src="./public/logo-clawkb-wordmark.png" alt="ClawKB" width="360" />
</p>

# ClawKB

**為人類與 AI Agent 協作而生的知識庫。**

ClawKB 讓人類和 AI Agent 共同建立、搜尋和管理知識條目，提供簡潔的 Web 介面和無頭 API。為 [OpenClaw](https://github.com/openclaw/openclaw) 生態設計，也可獨立使用。

[English](./README.md) | [简体中文](./README.zh-CN.md) | 繁體中文

## 功能特性

- 📝 **可自訂條目類型** — 內建預設類型（機會、報告、參考資料、專案筆記）；可在設定中新增、重新命名或刪除
- 🔍 **混合搜尋** — 向量搜尋（pgvector）+ 全文搜尋（tsvector）+ 模糊比對（ILIKE）三級級聯，內建搜尋頁面與 ⌘K 快速搜尋
- 📂 **集合** — 階層式資料夾，以樹狀結構組織條目
- 🏷️ **標籤與狀態管理** — 篩選、組織、追蹤條目生命週期
- 💬 **留言** — 每個條目的留言討論串
- ⭐ **收藏** — 星號標記條目，可在 `/favorites` 快速存取
- 🗑️ **軟刪除與回收站** — 刪除的條目進入回收站；可在 `/trash` 還原或永久刪除（管理員）
- 📊 **活動紀錄** — 自動記錄所有 CRUD 與留言操作，可在 `/activity` 檢視
- 🕸️ **知識圖譜** — 條目關係視覺化圖表，位於 `/graph`
- 📅 **時間軸** — 條目的時序檢視，位於 `/timeline`
- 🤖 **Agent 友善的 API** — Bearer Token 認證的 REST 端點，供排程任務和 AI Agent 使用
- 🖼️ **圖片附件** — 透過任意 S3 相容物件儲存（MinIO、AWS S3、Cloudflare R2 等）上傳
- 📤 **匯出** — 支援 CSV 和 JSON 格式匯出，附篩選功能
- 🔒 **多使用者認證** — 基於 Session 的登入（NextAuth.js）、使用者註冊、角色群組（管理員/編輯者/檢視者）、每使用者 API Token
- 🔌 **外掛系統** — 可擴充的 hook（`entry.serialize`、`entryCard.render`、`entry.afterQuery`），內建外掛：
  - **Backlinks** — 雙向連結偵測（`#id` 和 `/entries/id` 引用）
  - **Related Entries** — 語意相似條目探索
  - **Auto-tag** — 自動標籤建議
  - **Entry Templates** — 新條目的預設範本
  - **Export** — 擴充匯出格式
- 📊 **儀表板** — 統計總覽，含圖表和最新條目
- ⚙️ **設定** — 在 Web 介面中設定條目類型、Embedding 提供商、物件儲存、使用者與外掛
- 🌙 **暗色主題** — 編輯器風格暗色 UI，手機和桌面自適應

## 技術棧

| 層級 | 選型 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 資料庫 | PostgreSQL 17+ + [pgvector](https://github.com/pgvector/pgvector) |
| ORM | Prisma |
| Embedding | 可設定 — Ollama（bge-m3、nomic-embed 等）、OpenAI 或任意相容端點 |
| 認證 | NextAuth.js (Credentials) |
| 物件儲存 | 任意 S3 相容（MinIO、AWS S3、Cloudflare R2 等） |
| 樣式 | Tailwind CSS + CSS 變數 |
| 程序管理 | PM2 |

## 快速開始

### 前置條件

- Node.js 20+
- PostgreSQL 17+ 並安裝 [pgvector](https://github.com/pgvector/pgvector) 擴充
- Embedding 提供商（Ollama、OpenAI 或相容端點）

### 安裝

```bash
git clone https://github.com/openclaw/clawkb.git
cd clawkb

npm install

# 設定環境變數
cp .env.example .env
# 編輯 .env，填入資料庫 URL、認證密鑰等

# 執行資料庫遷移
npx prisma migrate deploy

# 初始化使用者
npm run seed

# 建置並啟動
npm run build
npm start
```

### Docker

```bash
git clone https://github.com/openclaw/clawkb.git
cd clawkb

# （可選）在 .env 中設定密鑰 — docker-compose 會自動讀取
cp .env.example .env

docker compose up -d
# 應用位於 http://localhost:3500（預設帳號：admin / change-me-on-first-login）
```

### 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user@localhost:5432/clawkb` |
| `NEXTAUTH_SECRET` | Session 加密密鑰 | (隨機字串) |
| `NEXTAUTH_URL` | 公開存取 URL | `https://kb.example.com` |
| `API_TOKEN` | Agent API 的全域 Bearer Token | (隨機字串) |
| **Embedding** | | |
| `EMBEDDING_PROVIDER` | 提供商類型 | `ollama` 或 `openai` |
| `EMBEDDING_URL` | Embedding API 端點 | `http://localhost:11434` |
| `EMBEDDING_MODEL` | 模型名稱 | `bge-m3` 或 `text-embedding-3-small` |
| `EMBEDDING_API_KEY` | API 金鑰（OpenAI 必填） | `sk-...` |
| **物件儲存（S3 相容）** | | |
| `S3_ENDPOINT` | S3 相容端點 | `minio.example.com` 或 `s3.amazonaws.com` |
| `S3_ACCESS_KEY` | 存取金鑰 | |
| `S3_SECRET_KEY` | 私密金鑰 | |
| `S3_BUCKET` | 儲存桶名稱 | `clawkb` |
| `S3_PUBLIC_URL` | 上傳檔案的公開 URL 前綴 | `https://minio.example.com/clawkb` |
| `S3_REGION` | 區域（AWS S3 必填） | `us-east-1` |

## 設定

ClawKB 內建設定頁面（`/settings`），可設定：

- **條目類型** — 新增、重新命名或刪除條目分類
- **Embedding** — 切換 Ollama、OpenAI 或其他提供商；變更模型
- **物件儲存** — 設定 S3 相容儲存連線
- **使用者** — 管理使用者和角色群組（管理員）
- **API Token** — 建立每使用者的 API Token 供 Agent 存取
- **外掛** — 啟用/停用與設定外掛

## API

所有 API 端點位於 `/api/`。存取需要 Session Cookie 或 `Authorization: Bearer <token>` 標頭（全域 `API_TOKEN` 或每使用者 token）。

| 方法 | 端點 | 說明 |
|------|------|------|
| **條目** | | |
| `GET` | `/api/entries` | 列表查詢（按類型、狀態、標籤篩選，分頁） |
| `POST` | `/api/entries` | 建立條目（自動產生 embedding） |
| `GET` | `/api/entries/[id]` | 取得單一條目 |
| `PATCH` | `/api/entries/[id]` | 更新條目欄位 |
| `DELETE` | `/api/entries/[id]` | 軟刪除條目 |
| **搜尋** | | |
| `POST` | `/api/search` | 混合搜尋（向量 + 全文 + 模糊） |
| **集合** | | |
| `GET` | `/api/collections` | 集合樹列表 |
| `POST` | `/api/collections` | 建立集合 |
| `PATCH` | `/api/collections/[id]` | 更新集合 |
| `DELETE` | `/api/collections/[id]` | 刪除集合 |
| **留言** | | |
| `GET` | `/api/entries/[id]/comments` | 條目留言列表 |
| `POST` | `/api/entries/[id]/comments` | 新增留言 |
| **收藏** | | |
| `GET` | `/api/favorites` | 已收藏條目列表 |
| `POST` | `/api/favorites` | 切換收藏狀態 |
| **活動紀錄** | | |
| `GET` | `/api/activity` | 活動紀錄 |
| **回收站** | | |
| `GET` | `/api/trash` | 已軟刪除的條目列表 |
| `POST` | `/api/trash` | 還原或永久刪除 |
| **圖譜** | | |
| `GET` | `/api/graph` | 知識圖譜資料 |
| **使用者與 Token** | | |
| `GET` | `/api/users` | 使用者列表（管理員） |
| `GET` | `/api/tokens` | API Token 列表 |
| `POST` | `/api/tokens` | 建立 API Token |
| `DELETE` | `/api/tokens/[id]` | 撤銷 Token |
| **外掛** | | |
| `GET` | `/api/plugins` | 已安裝外掛列表 |
| `PATCH` | `/api/plugins/[id]` | 啟用/停用外掛 |
| **其他** | | |
| `GET` | `/api/stats` | 儀表板統計 |
| `GET` | `/api/tags` | 列出所有標籤 |
| `GET` | `/api/export` | 匯出條目（CSV 或 JSON） |
| `POST` | `/api/upload` | 上傳圖片附件 |
| `GET` | `/api/settings` | 取得目前設定 |
| `PATCH` | `/api/settings` | 更新設定 |

### 範例：建立條目

```bash
curl -X POST http://localhost:3500/api/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "type": "opportunity",
    "source": "nightly-recon",
    "title": "發現新的 POD 平台",
    "summary": "簡短摘要",
    "content": "完整 markdown 內容...",
    "status": "new",
    "tags": ["pod", "automation"]
  }'
```

### 範例：搜尋

```bash
curl -X POST http://localhost:3500/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "被動收入自動化"}'
```

## 架構

```
瀏覽器/手機 → 反向代理 (Caddy/Nginx) → Next.js :3500 → PostgreSQL + pgvector
                                            ↑                    ↑
                                      AI Agent / 排程任務    Embedding 提供商
                                      (REST API)           (Ollama / OpenAI)
                                            ↓
                                       外掛系統
                                      (backlinks, auto-tag, templates, ...)
```

## 外掛

ClawKB 支援檔案式外掛系統。外掛位於 `plugins/` 目錄，可掛載到：

| Hook | 說明 |
|------|------|
| `entry.serialize` | 送出前修改 API 回應 |
| `entryCard.render` | 在條目卡片加入徽章/圖示/指標 |
| `entry.afterQuery` | 批量查詢後處理 |

### 內建外掛

| 外掛 | 說明 |
|------|------|
| `backlinks` | 掃描 `#id` 和 `/entries/id` 引用，建立雙向連結 |
| `related-entries` | 透過 embedding 尋找語意相似條目 |
| `auto-tag` | 根據內容建議標籤 |
| `entry-templates` | 常用條目類型的預設範本 |
| `export` | 擴充匯出格式與選項 |

## 路線圖

- [ ] ACL 權限系統（自訂群組 + 細粒度 read/edit/delete/create 權限，支援全域/類型/單篇）
- [ ] 版本差異檢視器
- [ ] RAG 查詢端點（查詢 → 檢索 → 合成）
- [ ] 新條目 Webhook 通知
- [ ] 選擇性條目公開分享

## 授權條款

MIT

---

由人類和 AI Agent 共同打造，為人類和 AI Agent 服務。🤖🤝🧑
