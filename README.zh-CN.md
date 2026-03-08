# 🧠 ClawKB

**为人类与 AI Agent 协作而生的知识库。**

ClawKB 让人类和 AI Agent 共同创建、搜索和管理知识条目，提供简洁的 Web 界面和无头 API。为 [OpenClaw](https://github.com/openclaw/openclaw) 生态设计，也可独立使用。

[English](./README.md) | 简体中文 | [繁體中文](./README.zh-TW.md)

## 功能特性

- 📝 **结构化条目** — 分类为机会、报告、参考资料或项目笔记
- 🔍 **混合搜索** — 向量搜索（pgvector + bge-m3）、全文搜索（tsvector）、模糊匹配（ILIKE）三级级联
- 🏷️ **标签与状态管理** — 筛选、组织、追踪条目生命周期
- 🤖 **Agent 友好的 API** — Bearer Token 认证的 REST 端点，供定时任务和 AI Agent 写入/查询
- 🖼️ **图片附件** — 通过兼容 MinIO/S3 的对象存储上传和关联图片
- 📊 **仪表盘** — 统计概览，含图表和最新条目
- 📤 **导出** — 支持 CSV 和 JSON 格式导出
- 🔒 **认证** — 基于会话的登录（NextAuth.js 凭证提供者）
- 🌙 **暗色主题** — 编辑器风格暗色 UI，手机和桌面自适应

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 数据库 | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| Embedding | Ollama bge-m3 (1024维) |
| 认证 | NextAuth.js (Credentials) |
| 对象存储 | MinIO (S3 兼容) |
| 样式 | Tailwind CSS + CSS 变量 |
| 进程管理 | PM2 |

## 快速开始

### 前置条件

- Node.js 20+
- PostgreSQL 16 并安装 [pgvector](https://github.com/pgvector/pgvector) 扩展
- Ollama 运行 `bge-m3` 模型（或任意 embedding 端点）

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

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user@localhost:5432/clawkb` |
| `NEXTAUTH_SECRET` | 会话加密密钥 | (随机字符串) |
| `NEXTAUTH_URL` | 公开访问 URL | `https://kb.example.com` |
| `API_TOKEN` | Agent API 的 Bearer Token | (随机字符串) |
| `OLLAMA_URL` | Ollama embedding 端点 | `http://localhost:11434` |
| `MINIO_ENDPOINT` | MinIO/S3 端点 | `minio.example.com` |
| `MINIO_ACCESS_KEY` | MinIO 访问密钥 | |
| `MINIO_SECRET_KEY` | MinIO 私密密钥 | |

## API

所有 API 端点位于 `/api/`。Agent/定时任务访问需要 `Authorization: Bearer <API_TOKEN>` 头。

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/entries` | 列表查询（按类型、状态、标签筛选，分页） |
| `POST` | `/api/entries` | 创建条目（自动生成 embedding） |
| `GET` | `/api/entries/[id]` | 获取单个条目 |
| `PATCH` | `/api/entries/[id]` | 更新条目字段 |
| `DELETE` | `/api/entries/[id]` | 删除条目 |
| `POST` | `/api/search` | 混合搜索（向量 + 全文 + 模糊） |
| `GET` | `/api/stats` | 仪表盘统计 |
| `GET` | `/api/tags` | 列出所有标签 |
| `GET` | `/api/export` | 导出条目（CSV 或 JSON） |
| `POST` | `/api/upload` | 上传图片附件 |

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
                                      AI Agent / 定时任务    Ollama bge-m3
                                      (REST API)           (向量嵌入)
```

## 路线图

- [ ] 多用户支持
- [ ] RAG 查询端点（查询 → 检索 → 合成）
- [ ] 新条目 Webhook 通知
- [ ] 自定义条目类型插件系统
- [ ] 选择性条目公开分享

## 许可证

MIT

---

由人类和 AI Agent 共同构建，为人类和 AI Agent 服务。🤖🤝🧑
