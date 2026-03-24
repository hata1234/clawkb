<p align="center">
  <img src="./public/logo-clawkb-wordmark.png" alt="ClawKB" width="360" />
</p>

# ClawKB

**为人类与 AI Agent 协作而生的知识库。**

ClawKB 让人类和 AI Agent 共同创建、搜索和管理知识条目，提供简洁的 Web 界面和无头 API。为 [OpenClaw](https://github.com/openclaw/openclaw) 生态设计，也可独立使用。

[English](./README.md) | 简体中文 | [繁體中文](./README.zh-TW.md) | [日本語](./README.ja.md)

## 截图

| 仪表盘 | 条目编辑器 | 知识图谱 |
|:-:|:-:|:-:|
| ![仪表盘](./docs/screenshots/dashboard.png) | ![条目编辑器](./docs/screenshots/entry-editor.png) | ![知识图谱](./docs/screenshots/knowledge-graph.png) |

| 搜索 (⌘K) | Ask AI (RAG) | BPMN 流程设计器 |
|:-:|:-:|:-:|
| ![搜索](./docs/screenshots/search.png) | ![Ask AI](./docs/screenshots/ask-ai.png) | ![BPMN](./docs/screenshots/bpmn-editor.png) |

| ACL 设置 | 语言切换 |
|:-:|:-:|
| ![ACL](./docs/screenshots/acl-settings.png) | ![i18n](./docs/screenshots/i18n-switcher.png) |

## 功能特性

### 核心 — 条目
- 📝 **富文本编辑器** — TipTap markdown 编辑器，支持实时预览
- 📂 **集合** — 层级式文件夹树状结构；条目可归属多个集合
- 🏷️ **标签与状态追踪** — 筛选、组织、追踪条目生命周期（new → interested → in_progress → done / dismissed）
- 🔗 **内部链接** — `[[entry:ID|title]]` Notion 风格提及，输入 `[[` 触发搜索菜单
- 🖼️ **图片附件** — 通过任意 S3 兼容对象存储上传（MinIO、AWS S3、R2）
- 📋 **元数据 (JSON)** — 每个条目的自定义 JSON 元数据

### 搜索与发现
- 🔍 **混合搜索** — 向量搜索（pgvector）+ 模糊匹配（ILIKE）级联管线
- ⌘ **快速搜索** — `⌘K` 全局搜索弹窗
- 🕸️ **知识图谱** — 交互式 d3-force 可视化，位于 `/graph`
- 📅 **时间轴** — 条目时序视图，位于 `/timeline`
- 🔙 **反向链接** — 双向链接检测
- 🧲 **相关条目** — 通过嵌入向量推荐语义相似条目

### 协作
- 👥 **多用户认证** — NextAuth.js 会话管理、注册 + 登录
- 🔒 **注册流程** — 可配置管理员审核 + 邮箱验证；未验证/未审核/已拒绝账号有专属登录错误提示
- 🛡️ **ACL 权限系统** — 以组为基础的集合访问控制；每个集合可限制特定组，角色分为 admin/editor/viewer；内置组：「Everyone」（含匿名访客）和「Users」（所有已注册用户）；有效角色取用户所有组中最高权限；`User.isAdmin` 可绕过所有 ACL
- 🔐 **功能权限** — 组可设置布尔开关：canCreateCollections、canUseRag、canExport、canManageWebhooks；未授权时 UI 元素隐藏且 API 返回 403
- 👤 **用户管理** — 管理员可删除用户，支持条目转移（指派给其他用户）或级联删除；显示条目与评论数量
- 📧 **SMTP 邮件** — Gmail / 自定义 SMTP，密码重置流程、通知邮件发送
- ⏱️ **忘记密码频率限制** — 每封邮件每 15 分钟最多 3 次请求
- 🔔 **通知系统** — 应用内通知铃铛，SSE 实时推送、未读徽章、标记已读
- 💬 **评论** — 每个条目的讨论串
- 📜 **版本历史** — 自动版本记录，附行内差异查看器；可比较任意两个版本或与当前内容对比
- 📊 **活动记录** — 自动记录 CRUD + 评论操作，位于 `/activity`；非管理员用户只能看到有访问权限的集合中的活动
- ⭐ **收藏** — 星标条目，位于 `/favorites` 快速访问
- 🗑️ **软删除与回收站** — 删除的条目进入回收站，可恢复或永久删除（管理员）
- 🔗 **分享链接** — 限时、可设密码的分享链接，无需登录即可访问

### AI 与 Agent 集成
- 🤖 **Agent 友好的 REST API** — 30+ 端点，Bearer Token 认证
- 🔑 **每用户 API Token** — 创建和撤销多个 Token
- 📡 **Agent 注册** — 通过 `/api/auth/register-agent` 程序化创建 Agent 账号
- 🧠 **RAG 查询（Ask AI）** — `/api/rag` 端点：向量检索 → LLM 合成，支持 SSE 流式传输；`/rag` 聊天界面附来源引用
- 🔔 **Webhooks** — HMAC-SHA256 签名事件推送，3 次指数退避重试；事件：entry.created/updated/deleted/restored、comment.created
- 🔌 **Gateway 自动召回** — OpenClaw Gateway 插件，自动将 RAG 注入 Agent 对话，依发送者 ACL 控制（拥有者完整召回 / 公开发送者限公开集合 / 未授权零召回）
- 🐾 **[OpenClaw Skill + 插件](https://github.com/hata1234/clawkb-openclaw)** — 安装配套 Skill，让你的 OpenClaw Agent 在聊天中直接读取、搜索和写入 ClawKB 条目

### 导入与导出
- 📥 **导入** — 批量导入 Markdown (.md)、JSON 或 CSV 文件，拖放界面、预览表格、重复检测（跳过/覆写/新建）；需选择目标集合，仅显示有写入权限的集合，后端验证写入权限
- 📤 **导出** — CSV、JSON、Markdown、PDF 格式，附筛选选项
- 📄 **PDF 导出** — 格式化 PDF，支持 markdown 渲染（标题、列表、表格、代码块）、CJK 支持（自动下载 Noto Sans TC 字体）、可选密码加密

### 插件系统
- 🔌 **基于文件的插件** — `plugins/` 目录，含 `manifest.json` + `server.mjs`
- Hooks：`entry.serialize`、`entryCard.render`、`entry.afterQuery`
- 内置：backlinks、related-entries、auto-tag、entry-templates、export
- Content Tags hook (`content.tags`) — 插件可注册 `{{tag:value}}` 语法进行行内渲染

### BPMN 流程设计器
- 🔀 **BPMN 流程设计器** — 基于 bpmn-js 的流程设计器，支持全屏编辑
- 📎 **EntryFlow 附件** — 每个条目可附加多个流程
- 🔗 **行内渲染** — 通过 `{{flow:ID}}` 语法嵌入流程

### 文档编号
- 🔢 **自动文档编号** — 集合前缀 + 流水号（例如 `QP-001`）

### 国际化
- 🌐 **i18n** — 4 种语言：English、繁體中文、简体中文、日本語（通过 next-intl）
- 🔤 **语言切换器** — 应用内侧边栏语言选择器，附国旗 emoji
- 🔗 **语系路由** — `/en/`、`/zh-TW/`、`/zh-CN/`、`/ja/` URL 前缀路由

### 界面
- 🌙 **暗色主题** — 编辑器风格暗色 UI，手机和桌面自适应
- 📊 **仪表盘** — 统计概览，含图表和最新条目
- ⚙️ **设置** — 配置条目类型、嵌入向量、对象存储、用户、插件、权限、Webhooks、RAG 等

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
git clone https://github.com/hata1234/clawkb.git
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
git clone https://github.com/hata1234/clawkb.git
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
- **集合** — 管理层级式文件夹结构
- **Embedding** — 切换 Ollama、OpenAI 或其他提供商；更改模型；重建嵌入向量
- **对象存储** — 配置 S3 兼容存储连接
- **用户** — 管理用户和角色组（管理员）
- **权限** — 细粒度 ACL，自定义组
- **API Token** — 创建每用户的 API Token 供 Agent 访问
- **插件** — 启用/禁用与配置插件
- **Webhooks** — 管理 Webhook 端点与查看发送历史
- **RAG / AI** — 配置 Ask AI 功能的 LLM 提供商

## API

所有 API 端点位于 `/api/`。访问需要 Session Cookie 或 `Authorization: Bearer <token>` 头（全局 `API_TOKEN` 或每用户 Token）。

| 方法 | 端点 | 说明 |
|------|------|------|
| **条目** | | |
| `GET` | `/api/entries` | 列表查询（按类型、状态、标签筛选，分页） |
| `POST` | `/api/entries` | 创建条目（自动生成 embedding） |
| `GET` | `/api/entries/[id]` | 获取单个条目 |
| `PATCH` | `/api/entries/[id]` | 更新条目字段 |
| `DELETE` | `/api/entries/[id]` | 软删除条目 |
| **搜索** | | |
| `POST` | `/api/search` | 混合搜索（向量 + 模糊） |
| **RAG** | | |
| `POST` | `/api/rag` | RAG 查询 — 向量检索 → LLM 合成（支持 SSE 流式传输） |
| **集合** | | |
| `GET` | `/api/collections` | 集合树列表 |
| `POST` | `/api/collections` | 创建集合 |
| `PATCH` | `/api/collections/[id]` | 更新集合 |
| `DELETE` | `/api/collections/[id]` | 删除集合 |
| **评论** | | |
| `GET` | `/api/entries/[id]/comments` | 条目评论列表 |
| `POST` | `/api/entries/[id]/comments` | 添加评论 |
| **导入** | | |
| `POST` | `/api/import` | 批量导入条目（Markdown、JSON、CSV） |
| **Webhooks** | | |
| `GET` | `/api/webhooks` | Webhook 列表 |
| `POST` | `/api/webhooks` | 创建 Webhook |
| `PATCH` | `/api/webhooks/[id]` | 更新 Webhook |
| `DELETE` | `/api/webhooks/[id]` | 删除 Webhook |
| `GET` | `/api/webhooks/[id]/deliveries` | Webhook 发送历史 |
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

### 示例：Ask AI（RAG）

```bash
curl -X POST http://localhost:3500/api/rag \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "DGX Spark 的设置方式？", "stream": true}'
```

### 示例：导入

```bash
# JSON 导入
curl -X POST http://localhost:3500/api/import \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F 'files=@entries.json'

# Markdown 导入（多个文件）
curl -X POST http://localhost:3500/api/import \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F 'files=@note1.md' -F 'files=@note2.md'
```

## 架构

```
浏览器/手机 → 反向代理 (Caddy/Nginx) → Next.js :3500 → PostgreSQL + pgvector
                                            ↑                    ↑
                                      AI Agent / 定时任务    Embedding 提供商
                                      (REST API)           (Ollama / OpenAI)
                                            ↓
                                       插件系统
                                      (backlinks, auto-tag, templates, export, ...)

OpenClaw Gateway ──(clawkb-recall 插件)──→ ClawKB API
                                              ↓
                                         自动 RAG 注入
                                         至 Agent 对话
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
| `export` | CSV、JSON、Markdown、PDF 导出，支持 CJK 和可选加密 |

## 路线图

### ✅ 已完成
- [x] ACL 权限系统（以组为基础的集合访问控制，支持 admin/editor/viewer 角色 + 每组功能权限开关）
- [x] 版本差异查看器（行内差异 + 与当前内容对比）
- [x] RAG 查询端点 + Ask AI 聊天界面，支持流式传输
- [x] Webhooks，HMAC-SHA256 签名推送
- [x] PDF 导出，支持 CJK 和密码加密
- [x] 导入（Markdown / JSON / CSV 批量导入，附预览界面）
- [x] i18n — 4 种语言（EN / zh-TW / zh-CN / ja），next-intl 语系路由
- [x] 集合（层级式文件夹，取代旧的 Type 系统）
- [x] 内部链接（`[[entry:ID|title]]`）
- [x] 分享链接（限时 + 可设密码）
- [x] Gateway 自动召回插件，依发送者 ACL 控制
- [x] SMTP 邮件系统（Gmail / 自定义 SMTP，密码重置、通知邮件）
- [x] 通知系统（应用内铃铛 + SSE 实时推送 + 邮件发送）
- [x] ACL 统一重构（组 × 集合 → 角色，每组功能权限开关）
- [x] 文档编号模板（自动生成条目编号，例如 QP-{collection}-{seq:4}）
- [x] 全局浮动 AI 聊天框（任意页面可使用 Ask AI）
- [x] BPMN 流程设计器 + Content Tag 系统（插件 `{{tag:value}}` 架构）
- [x] 集合级 ACL（每集合的组访问控制）
- [x] 功能权限（每组开关：创建集合、RAG、导出、Webhooks）
- [x] 用户管理（管理员删除，支持条目转移或级联删除）
- [x] 注册流程（管理员审核 + 邮箱验证）
- [x] 导入 ACL（集合选择器，含写入权限验证）
- [x] 活动记录 ACL 过滤（非管理员只看有访问权限的集合活动）

### 🔜 计划中
- [ ] 协同编辑（Yjs / Liveblocks）
- [ ] 公开分享模式（公开 slug，无需登录）
- [ ] 移动版 PWA
- [ ] 批量操作（多选 + 批次动作）

## 许可证

本项目基于 [GNU Affero General Public License v3.0](./LICENSE) 许可 — 详见 [LICENSE](./LICENSE) 文件。

---

由人类和 AI Agent 共同构建，为人类和 AI Agent 服务。🤖🤝🧑
