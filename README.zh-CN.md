<p align="center">
  <img src="./public/logo-clawkb-wordmark.png" alt="ClawKB" width="360" />
</p>

# ClawKB

**为人类与 AI Agent 协作而生的知识库。**

ClawKB 让人类和 AI Agent 共同创建、搜索和管理知识条目，提供简洁的 Web 界面和无头 API。为 [OpenClaw](https://github.com/openclaw/openclaw) 生态设计，也可独立使用。

[English](./README.md) | 简体中文 | [繁體中文](./README.zh-TW.md)

## 功能特性

- 📝 **可自定义条目类型** — 内置默认类型（机会、报告、参考资料、项目笔记）；可在设置中添加、重命名或删除
- 🔍 **混合搜索** — 向量搜索（pgvector）+ 全文搜索（tsvector）+ 模糊匹配（ILIKE）三级级联，内置搜索页面与 ⌘K 快速搜索
- 📂 **集合** — 层级式文件夹，以树状结构组织条目
- 🏷️ **标签与状态管理** — 筛选、组织、追踪条目生命周期
- 💬 **评论** — 每个条目的评论讨论串
- ⭐ **收藏** — 星标条目，可在 `/favorites` 快速访问
- 🗑️ **软删除与回收站** — 删除的条目进入回收站；可在 `/trash` 恢复或永久删除（管理员）
- 📊 **活动记录** — 自动记录所有 CRUD 与评论操作，可在 `/activity` 查看
- 🕸️ **知识图谱** — 条目关系可视化图表，位于 `/graph`
- 📅 **时间轴** — 条目的时序视图，位于 `/timeline`
- 🤖 **Agent 友好的 API** — Bearer Token 认证的 REST 端点，供定时任务和 AI Agent 使用
- 🖼️ **图片附件** — 通过任意 S3 兼容对象存储（MinIO、AWS S3、Cloudflare R2 等）上传
- 📤 **导出** — 支持 CSV 和 JSON 格式导出，附筛选功能
- 🔒 **多用户认证** — 基于会话的登录（NextAuth.js）、用户注册、角色组（管理员/编辑者/查看者）、每用户 API Token
- 🔌 **插件系统** — 可扩展的 hook（`entry.serialize`、`entryCard.render`、`entry.afterQuery`），内置插件：
  - **Backlinks** — 双向链接检测（`#id` 和 `/entries/id` 引用）
  - **Related Entries** — 语义相似条目发现
  - **Auto-tag** — 自动标签建议
  - **Entry Templates** — 新条目的预设模板
  - **Export** — 扩展导出格式
- 📊 **仪表盘** — 统计概览，含图表和最新条目
- ⚙️ **设置** — 在 Web 界面中配置条目类型、Embedding 提供商、对象存储、用户与插件
- 🌙 **暗色主题** — 编辑器风格暗色 UI，手机和桌面自适应

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 数据库 | PostgreSQL 17+ + [pgvector](https://github.com/pgvector/pgvector) |
| ORM | Prisma |
| Embedding | 可配置 — Ollama（bge-m3、nomic-embed 等）、OpenAI 或任意兼容端点 |
| 认证 | NextAuth.js (Credentials) |
| 对象存储 | 任意 S3 兼容（MinIO、AWS S3、Cloudflare R2 等） |
| 样式 | Tailwind CSS + CSS 变量 |
| 进程管理 | PM2 |

## 快速开始

### 前置条件

- Node.js 20+
- PostgreSQL 17+ 并安装 [pgvector](https://github.com/pgvector/pgvector) 扩展
- Embedding 提供商（Ollama、OpenAI 或兼容端点）

### 安装

```bash
git clone https://github.com/openclaw/clawkb.git
cd clawkb

npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库 URL、认证密钥等

# 运行数据库迁移
npx prisma migrate deploy

# 初始化用户
npm run seed

# 构建并启动
npm run build
npm start
```

### Docker

```bash
git clone https://github.com/openclaw/clawkb.git
cd clawkb

# （可选）在 .env 中设置密钥 — docker-compose 会自动读取
cp .env.example .env

docker compose up -d
# 应用位于 http://localhost:3500（默认账号：admin / change-me-on-first-login）
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user@localhost:5432/clawkb` |
| `NEXTAUTH_SECRET` | 会话加密密钥 | (随机字符串) |
| `NEXTAUTH_URL` | 公开访问 URL | `https://kb.example.com` |
| `API_TOKEN` | Agent API 的全局 Bearer Token | (随机字符串) |
| **Embedding** | | |
| `EMBEDDING_PROVIDER` | 提供商类型 | `ollama` 或 `openai` |
| `EMBEDDING_URL` | Embedding API 端点 | `http://localhost:11434` |
| `EMBEDDING_MODEL` | 模型名称 | `bge-m3` 或 `text-embedding-3-small` |
| `EMBEDDING_API_KEY` | API 密钥（OpenAI 必填） | `sk-...` |
| **对象存储（S3 兼容）** | | |
| `S3_ENDPOINT` | S3 兼容端点 | `minio.example.com` 或 `s3.amazonaws.com` |
| `S3_ACCESS_KEY` | 访问密钥 | |
| `S3_SECRET_KEY` | 私密密钥 | |
| `S3_BUCKET` | 存储桶名称 | `clawkb` |
| `S3_PUBLIC_URL` | 上传文件的公开 URL 前缀 | `https://minio.example.com/clawkb` |
| `S3_REGION` | 区域（AWS S3 必填） | `us-east-1` |

## 设置

ClawKB 内置设置页面（`/settings`），可配置：

- **条目类型** — 添加、重命名或删除条目分类
- **Embedding** — 切换 Ollama、OpenAI 或其他提供商；更改模型
- **对象存储** — 配置 S3 兼容存储连接
- **用户** — 管理用户和角色组（管理员）
- **API Token** — 创建每用户的 API Token 供 Agent 访问
- **插件** — 启用/禁用与配置插件

## API

所有 API 端点位于 `/api/`。访问需要 Session Cookie 或 `Authorization: Bearer <token>` 头（全局 `API_TOKEN` 或每用户 token）。

| 方法 | 端点 | 说明 |
|------|------|------|
| **条目** | | |
| `GET` | `/api/entries` | 列表查询（按类型、状态、标签筛选，分页） |
| `POST` | `/api/entries` | 创建条目（自动生成 embedding） |
| `GET` | `/api/entries/[id]` | 获取单个条目 |
| `PATCH` | `/api/entries/[id]` | 更新条目字段 |
| `DELETE` | `/api/entries/[id]` | 软删除条目 |
| **搜索** | | |
| `POST` | `/api/search` | 混合搜索（向量 + 全文 + 模糊） |
| **集合** | | |
| `GET` | `/api/collections` | 集合树列表 |
| `POST` | `/api/collections` | 创建集合 |
| `PATCH` | `/api/collections/[id]` | 更新集合 |
| `DELETE` | `/api/collections/[id]` | 删除集合 |
| **评论** | | |
| `GET` | `/api/entries/[id]/comments` | 条目评论列表 |
| `POST` | `/api/entries/[id]/comments` | 添加评论 |
| **收藏** | | |
| `GET` | `/api/favorites` | 已收藏条目列表 |
| `POST` | `/api/favorites` | 切换收藏状态 |
| **活动记录** | | |
| `GET` | `/api/activity` | 活动记录 |
| **回收站** | | |
| `GET` | `/api/trash` | 已软删除的条目列表 |
| `POST` | `/api/trash` | 恢复或永久删除 |
| **图谱** | | |
| `GET` | `/api/graph` | 知识图谱数据 |
| **用户与 Token** | | |
| `GET` | `/api/users` | 用户列表（管理员） |
| `GET` | `/api/tokens` | API Token 列表 |
| `POST` | `/api/tokens` | 创建 API Token |
| `DELETE` | `/api/tokens/[id]` | 撤销 Token |
| **插件** | | |
| `GET` | `/api/plugins` | 已安装插件列表 |
| `PATCH` | `/api/plugins/[id]` | 启用/禁用插件 |
| **其他** | | |
| `GET` | `/api/stats` | 仪表盘统计 |
| `GET` | `/api/tags` | 列出所有标签 |
| `GET` | `/api/export` | 导出条目（CSV 或 JSON） |
| `POST` | `/api/upload` | 上传图片附件 |
| `GET` | `/api/settings` | 获取当前设置 |
| `PATCH` | `/api/settings` | 更新设置 |

### 示例：创建条目

```bash
curl -X POST http://localhost:3500/api/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "type": "opportunity",
    "source": "nightly-recon",
    "title": "发现新的 POD 平台",
    "summary": "简短摘要",
    "content": "完整 markdown 内容...",
    "status": "new",
    "tags": ["pod", "automation"]
  }'
```

### 示例：搜索

```bash
curl -X POST http://localhost:3500/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "被动收入自动化"}'
```

## 架构

```
浏览器/手机 → 反向代理 (Caddy/Nginx) → Next.js :3500 → PostgreSQL + pgvector
                                            ↑                    ↑
                                      AI Agent / 定时任务    Embedding 提供商
                                      (REST API)           (Ollama / OpenAI)
                                            ↓
                                       插件系统
                                      (backlinks, auto-tag, templates, ...)
```

## 插件

ClawKB 支持基于文件的插件系统。插件位于 `plugins/` 目录，可挂载到：

| Hook | 说明 |
|------|------|
| `entry.serialize` | 发送前修改 API 响应 |
| `entryCard.render` | 在条目卡片添加徽章/图标/指标 |
| `entry.afterQuery` | 批量查询后处理 |

### 内置插件

| 插件 | 说明 |
|------|------|
| `backlinks` | 扫描 `#id` 和 `/entries/id` 引用，建立双向链接 |
| `related-entries` | 通过 embedding 发现语义相似条目 |
| `auto-tag` | 根据内容建议标签 |
| `entry-templates` | 常用条目类型的预设模板 |
| `export` | 扩展导出格式与选项 |

## 路线图

- [ ] ACL 权限系统（自定义组 + 细粒度 read/edit/delete/create 权限，支持全局/类型/单条）
- [ ] 版本差异查看器
- [ ] RAG 查询端点（查询 → 检索 → 合成）
- [ ] 新条目 Webhook 通知
- [ ] 选择性条目公开分享

## 许可证

MIT

---

由人类和 AI Agent 共同构建，为人类和 AI Agent 服务。🤖🤝🧑
