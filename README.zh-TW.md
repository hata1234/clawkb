<p align="center">
  <img src="./public/logo-clawkb-wordmark.png" alt="ClawKB" width="360" />
</p>

# ClawKB

**為人類與 AI Agent 協作而生的知識庫。**

ClawKB 讓人類和 AI Agent 共同建立、搜尋和管理知識條目，提供簡潔的 Web 介面和無頭 API。為 [OpenClaw](https://github.com/openclaw/openclaw) 生態設計，也可獨立使用。

[English](./README.md) | [简体中文](./README.zh-CN.md) | 繁體中文 | [日本語](./README.ja.md)

## 功能特性

### 核心 — 條目
- 📝 **富文字編輯器** — TipTap markdown 編輯器，支援即時預覽
- 📂 **集合** — 階層式資料夾樹狀結構；條目可歸屬多個集合
- 🏷️ **標籤與狀態追蹤** — 篩選、組織、追蹤條目生命週期（new → interested → in_progress → done / dismissed）
- 🔗 **內部連結** — `[[entry:ID|title]]` Notion 風格提及，輸入 `[[` 觸發搜尋選單
- 🖼️ **圖片附件** — 透過任意 S3 相容物件儲存上傳（MinIO、AWS S3、R2）
- 📋 **中繼資料 (JSON)** — 每個條目的自訂 JSON 中繼資料

### 搜尋與探索
- 🔍 **混合搜尋** — 向量搜尋（pgvector）+ 模糊比對（ILIKE）級聯管線
- ⌘ **快速搜尋** — `⌘K` 全域搜尋彈窗
- 🕸️ **知識圖譜** — 互動式 d3-force 視覺化，位於 `/graph`
- 📅 **時間軸** — 條目時序檢視，位於 `/timeline`
- 🔙 **反向連結** — 雙向連結偵測
- 🧲 **相關條目** — 透過嵌入向量推薦語意相似條目

### 協作
- 👥 **多使用者認證** — NextAuth.js 會話管理、註冊 + 登入
- 🛡️ **ACL 權限系統** — 基於角色的存取控制，支援細粒度權限（read/edit/delete/create × 全域/集合/條目/自有範圍）；角色定義權限、群組指派預設角色、使用者可覆寫
- 📧 **SMTP 郵件** — Gmail / 自訂 SMTP，密碼重設流程、通知郵件發送
- 🔔 **通知系統** — 應用內通知鈴鐺，SSE 即時推送、未讀徽章、標記已讀
- 💬 **留言** — 每個條目的討論串
- 📜 **版本歷史** — 自動版本記錄，附行內差異檢視器；可比較任意兩個版本或與當前內容對比
- 📊 **活動紀錄** — 自動記錄 CRUD + 留言操作，位於 `/activity`
- ⭐ **收藏** — 星號標記條目，位於 `/favorites` 快速存取
- 🗑️ **軟刪除與回收站** — 刪除的條目進入回收站，可還原或永久刪除（管理員）
- 🔗 **分享連結** — 限時、可設密碼的分享連結，無需登入即可存取

### AI 與 Agent 整合
- 🤖 **Agent 友善的 REST API** — 30+ 端點，Bearer Token 認證
- 🔑 **每使用者 API Token** — 建立和撤銷多個 Token
- 📡 **Agent 註冊** — 透過 `/api/auth/register-agent` 程式化建立 Agent 帳號
- 🧠 **RAG 查詢（Ask AI）** — `/api/rag` 端點：向量檢索 → LLM 合成，支援 SSE 串流；`/rag` 聊天介面附來源引用
- 🔔 **Webhooks** — HMAC-SHA256 簽名事件推送，3 次指數退避重試；事件：entry.created/updated/deleted/restored、comment.created
- 🔌 **Gateway 自動召回** — OpenClaw Gateway 外掛，自動將 RAG 注入 Agent 對話，依發送者 ACL 控制（擁有者完整召回 / 公開發送者限公開集合 / 未授權零召回）

### 匯入與匯出
- 📥 **匯入** — 批量匯入 Markdown (.md)、JSON 或 CSV 檔案，拖放介面、預覽表格、重複偵測（跳過/覆寫/新建）
- 📤 **匯出** — CSV、JSON、Markdown、PDF 格式，附篩選選項
- 📄 **PDF 匯出** — 格式化 PDF，支援 markdown 渲染（標題、列表、表格、程式碼區塊）、CJK 支援（自動下載 Noto Sans TC 字型）、可選密碼加密

### 外掛系統
- 🔌 **檔案式外掛** — `plugins/` 目錄，含 `manifest.json` + `server.mjs`
- Hooks：`entry.serialize`、`entryCard.render`、`entry.afterQuery`
- 內建：backlinks、related-entries、auto-tag、entry-templates、export
- Content Tags hook (`content.tags`) — 外掛可註冊 `{{tag:value}}` 語法進行行內渲染

### BPMN 流程設計器
- 🔀 **BPMN 流程設計器** — 基於 bpmn-js 的流程設計器，支援全螢幕編輯
- 📎 **EntryFlow 附件** — 每個條目可附加多個流程
- 🔗 **行內渲染** — 透過 `{{flow:ID}}` 語法嵌入流程

### 文件編號
- 🔢 **自動文件編號** — 集合前綴 + 流水號（例如 `QP-001`）

### 國際化
- 🌐 **i18n** — 4 種語言：English、繁體中文、简体中文、日本語（透過 next-intl）
- 🔤 **語言切換器** — 應用內側邊欄語言選擇器，附國旗 emoji
- 🔗 **語系路由** — `/en/`、`/zh-TW/`、`/zh-CN/`、`/ja/` URL 前綴路由

### 介面
- 🌙 **暗色主題** — 編輯器風格暗色 UI，手機和桌面自適應
- 📊 **儀表板** — 統計總覽，含圖表和最新條目
- ⚙️ **設定** — 設定條目類型、嵌入向量、物件儲存、使用者、外掛、權限、Webhooks、RAG 等

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
- **集合** — 管理階層式資料夾結構
- **Embedding** — 切換 Ollama、OpenAI 或其他提供商；變更模型；重建嵌入向量
- **物件儲存** — 設定 S3 相容儲存連線
- **使用者** — 管理使用者和角色群組（管理員）
- **權限** — 細粒度 ACL，自訂群組
- **API Token** — 建立每使用者的 API Token 供 Agent 存取
- **外掛** — 啟用/停用與設定外掛
- **Webhooks** — 管理 Webhook 端點與檢視發送歷史
- **RAG / AI** — 設定 Ask AI 功能的 LLM 提供商

## API

所有 API 端點位於 `/api/`。存取需要 Session Cookie 或 `Authorization: Bearer <token>` 標頭（全域 `API_TOKEN` 或每使用者 Token）。

| 方法 | 端點 | 說明 |
|------|------|------|
| **條目** | | |
| `GET` | `/api/entries` | 列表查詢（按類型、狀態、標籤篩選，分頁） |
| `POST` | `/api/entries` | 建立條目（自動產生 embedding） |
| `GET` | `/api/entries/[id]` | 取得單一條目 |
| `PATCH` | `/api/entries/[id]` | 更新條目欄位 |
| `DELETE` | `/api/entries/[id]` | 軟刪除條目 |
| **搜尋** | | |
| `POST` | `/api/search` | 混合搜尋（向量 + 模糊） |
| **RAG** | | |
| `POST` | `/api/rag` | RAG 查詢 — 向量檢索 → LLM 合成（支援 SSE 串流） |
| **集合** | | |
| `GET` | `/api/collections` | 集合樹列表 |
| `POST` | `/api/collections` | 建立集合 |
| `PATCH` | `/api/collections/[id]` | 更新集合 |
| `DELETE` | `/api/collections/[id]` | 刪除集合 |
| **留言** | | |
| `GET` | `/api/entries/[id]/comments` | 條目留言列表 |
| `POST` | `/api/entries/[id]/comments` | 新增留言 |
| **匯入** | | |
| `POST` | `/api/import` | 批量匯入條目（Markdown、JSON、CSV） |
| **Webhooks** | | |
| `GET` | `/api/webhooks` | Webhook 列表 |
| `POST` | `/api/webhooks` | 建立 Webhook |
| `PATCH` | `/api/webhooks/[id]` | 更新 Webhook |
| `DELETE` | `/api/webhooks/[id]` | 刪除 Webhook |
| `GET` | `/api/webhooks/[id]/deliveries` | Webhook 發送歷史 |
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

### 範例：Ask AI（RAG）

```bash
curl -X POST http://localhost:3500/api/rag \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "DGX Spark 的設定方式？", "stream": true}'
```

### 範例：匯入

```bash
# JSON 匯入
curl -X POST http://localhost:3500/api/import \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F 'files=@entries.json'

# Markdown 匯入（多個檔案）
curl -X POST http://localhost:3500/api/import \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F 'files=@note1.md' -F 'files=@note2.md'
```

## 架構

```
瀏覽器/手機 → 反向代理 (Caddy/Nginx) → Next.js :3500 → PostgreSQL + pgvector
                                            ↑                    ↑
                                      AI Agent / 排程任務    Embedding 提供商
                                      (REST API)           (Ollama / OpenAI)
                                            ↓
                                       外掛系統
                                      (backlinks, auto-tag, templates, export, ...)

OpenClaw Gateway ──(clawkb-recall 外掛)──→ ClawKB API
                                              ↓
                                         自動 RAG 注入
                                         至 Agent 對話
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
| `export` | CSV、JSON、Markdown、PDF 匯出，支援 CJK 和可選加密 |

## 路線圖

### ✅ 已完成
- [x] ACL 權限系統（自訂群組 + 細粒度 read/edit/delete/create 權限，支援全域/集合/條目/自有範圍）
- [x] 版本差異檢視器（行內差異 + 與當前內容對比）
- [x] RAG 查詢端點 + Ask AI 聊天介面，支援串流
- [x] Webhooks，HMAC-SHA256 簽名推送
- [x] PDF 匯出，支援 CJK 和密碼加密
- [x] 匯入（Markdown / JSON / CSV 批量匯入，附預覽介面）
- [x] i18n — 4 種語言（EN / zh-TW / zh-CN / ja），next-intl 語系路由
- [x] 集合（階層式資料夾，取代舊的 Type 系統）
- [x] 內部連結（`[[entry:ID|title]]`）
- [x] 分享連結（限時 + 可設密碼）
- [x] Gateway 自動召回外掛，依發送者 ACL 控制
- [x] SMTP 郵件系統（Gmail / 自訂 SMTP，密碼重設、通知郵件）
- [x] 通知系統（應用內鈴鐺 + SSE 即時推送 + 郵件發送）
- [x] ACL 統一重構（角色 + 群組 + 使用者，細粒度操作×範圍權限）
- [x] 文件編號範本（自動產生條目編號，例如 QP-{collection}-{seq:4}）
- [x] 全域浮動 AI 聊天框（任意頁面可使用 Ask AI）
- [x] BPMN 流程設計器 + Content Tag 系統（外掛 `{{tag:value}}` 架構）

### 🔜 計畫中
- [ ] 協同編輯（Yjs / Liveblocks）
- [ ] 公開分享模式（公開 slug，無需登入）
- [ ] 行動版 PWA
- [ ] 批量操作（多選 + 批次動作）

## 授權條款

MIT

---

由人類和 AI Agent 共同打造，為人類和 AI Agent 服務。🤖🤝🧑
