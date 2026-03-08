# 🧠 ClawKB

**為人類與 AI Agent 協作而生的知識庫。**

ClawKB 讓人類和 AI Agent 共同建立、搜尋和管理知識條目，提供簡潔的 Web 介面和無頭 API。為 [OpenClaw](https://github.com/openclaw/openclaw) 生態設計，也可獨立使用。

[English](./README.md) | [简体中文](./README.zh-CN.md) | 繁體中文

## 功能特性

- 📝 **結構化條目** — 分類為機會、報告、參考資料或專案筆記
- 🔍 **混合搜尋** — 向量搜尋（pgvector + bge-m3）、全文搜尋（tsvector）、模糊比對（ILIKE）三級級聯
- 🏷️ **標籤與狀態管理** — 篩選、組織、追蹤條目生命週期
- 🤖 **Agent 友善的 API** — Bearer Token 認證的 REST 端點，供排程任務和 AI Agent 寫入/查詢
- 🖼️ **圖片附件** — 透過相容 MinIO/S3 的物件儲存上傳和關聯圖片
- 📊 **儀表板** — 統計總覽，含圖表和最新條目
- 📤 **匯出** — 支援 CSV 和 JSON 格式匯出
- 🔒 **認證** — 基於 Session 的登入（NextAuth.js 憑證提供者）
- 🌙 **暗色主題** — 編輯器風格暗色 UI，手機和桌面自適應

## 技術棧

| 層級 | 選型 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 資料庫 | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| Embedding | Ollama bge-m3 (1024維) |
| 認證 | NextAuth.js (Credentials) |
| 物件儲存 | MinIO (S3 相容) |
| 樣式 | Tailwind CSS + CSS 變數 |
| 程序管理 | PM2 |

## 快速開始

### 前置條件

- Node.js 20+
- PostgreSQL 16 並安裝 [pgvector](https://github.com/pgvector/pgvector) 擴充
- Ollama 運行 `bge-m3` 模型（或任意 embedding 端點）

### 安裝

```bash
git clone https://github.com/hata1234/clawkb.git
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

### 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user@localhost:5432/clawkb` |
| `NEXTAUTH_SECRET` | Session 加密密鑰 | (隨機字串) |
| `NEXTAUTH_URL` | 公開存取 URL | `https://kb.example.com` |
| `API_TOKEN` | Agent API 的 Bearer Token | (隨機字串) |
| `OLLAMA_URL` | Ollama embedding 端點 | `http://localhost:11434` |
| `MINIO_ENDPOINT` | MinIO/S3 端點 | `minio.example.com` |
| `MINIO_ACCESS_KEY` | MinIO 存取金鑰 | |
| `MINIO_SECRET_KEY` | MinIO 私密金鑰 | |

## API

所有 API 端點位於 `/api/`。Agent/排程任務存取需要 `Authorization: Bearer <API_TOKEN>` 標頭。

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/api/entries` | 列表查詢（按類型、狀態、標籤篩選，分頁） |
| `POST` | `/api/entries` | 建立條目（自動產生 embedding） |
| `GET` | `/api/entries/[id]` | 取得單一條目 |
| `PATCH` | `/api/entries/[id]` | 更新條目欄位 |
| `DELETE` | `/api/entries/[id]` | 刪除條目 |
| `POST` | `/api/search` | 混合搜尋（向量 + 全文 + 模糊） |
| `GET` | `/api/stats` | 儀表板統計 |
| `GET` | `/api/tags` | 列出所有標籤 |
| `GET` | `/api/export` | 匯出條目（CSV 或 JSON） |
| `POST` | `/api/upload` | 上傳圖片附件 |

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
                                      AI Agent / 排程任務    Ollama bge-m3
                                      (REST API)           (向量嵌入)
```

## 路線圖

- [ ] 多使用者支援
- [ ] RAG 查詢端點（查詢 → 檢索 → 合成）
- [ ] 新條目 Webhook 通知
- [ ] 自訂條目類型外掛系統
- [ ] 選擇性條目公開分享

## 授權條款

MIT

---

由人類和 AI Agent 共同打造，為人類和 AI Agent 服務。🤖🤝🧑
