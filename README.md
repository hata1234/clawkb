# 🧠 ClawKB

**A knowledge base built for Human–AI Agent collaboration.**

ClawKB lets humans and AI agents co-create, search, and manage knowledge entries through a clean web UI and a headless API. Designed for the [OpenClaw](https://github.com/openclaw/openclaw) ecosystem but works standalone.

English | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md)

## Features

- 📝 **Structured entries** — Classify as opportunity, report, reference, or project note
- 🔍 **Hybrid search** — Vector (pgvector + bge-m3), full-text (tsvector), and fuzzy (ILIKE) in a cascading pipeline
- 🏷️ **Tags & status tracking** — Filter, organize, and track entry lifecycle
- 🤖 **Agent-friendly API** — Bearer-token authenticated REST endpoints for cron jobs and AI agents to write/query entries
- 🖼️ **Image attachments** — Upload and attach images to entries via MinIO-compatible object storage
- 📊 **Dashboard** — Stats overview with charts and recent entries
- 📤 **Export** — CSV and JSON export from the UI or API
- 🔒 **Auth** — Session-based login (NextAuth.js credentials provider)
- 🌙 **Dark theme** — Editorial dark UI, responsive on mobile and desktop

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| Embedding | Ollama bge-m3 (1024d) |
| Auth | NextAuth.js (Credentials) |
| Object Storage | MinIO (S3-compatible) |
| Styling | Tailwind CSS + CSS variables |
| Process Manager | PM2 |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16 with [pgvector](https://github.com/pgvector/pgvector) extension
- Ollama running `bge-m3` model (or any embedding endpoint)

### Install

```bash
git clone https://github.com/hata1234/clawkb.git
cd clawkb

npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL, auth secret, etc.

# Run migrations
npx prisma migrate deploy

# Seed initial user
npm run seed

# Build & start
npm run build
npm start
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user@localhost:5432/clawkb` |
| `NEXTAUTH_SECRET` | Session encryption secret | (random string) |
| `NEXTAUTH_URL` | Public URL | `https://kb.example.com` |
| `API_TOKEN` | Bearer token for agent API access | (random string) |
| `OLLAMA_URL` | Ollama embedding endpoint | `http://localhost:11434` |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint | `minio.example.com` |
| `MINIO_ACCESS_KEY` | MinIO access key | |
| `MINIO_SECRET_KEY` | MinIO secret key | |

## API

All API endpoints are under `/api/`. Agent/cron access requires `Authorization: Bearer <API_TOKEN>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/entries` | List entries (filter by type, status, tags; pagination) |
| `POST` | `/api/entries` | Create entry (auto-generates embedding) |
| `GET` | `/api/entries/[id]` | Get single entry |
| `PATCH` | `/api/entries/[id]` | Update entry fields |
| `DELETE` | `/api/entries/[id]` | Delete entry |
| `POST` | `/api/search` | Hybrid search (vector + full-text + fuzzy) |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/tags` | List all tags |
| `GET` | `/api/export` | Export entries as CSV or JSON |
| `POST` | `/api/upload` | Upload image attachment |

### Example: Create an Entry

```bash
curl -X POST http://localhost:3500/api/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "type": "opportunity",
    "source": "nightly-recon",
    "title": "New POD platform discovered",
    "summary": "A brief summary",
    "content": "Full markdown content here...",
    "status": "new",
    "tags": ["pod", "automation"]
  }'
```

### Example: Search

```bash
curl -X POST http://localhost:3500/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"query": "passive income automation"}'
```

## Architecture

```
Browser/Mobile → Reverse Proxy (Caddy/Nginx) → Next.js :3500 → PostgreSQL + pgvector
                                                    ↑                    ↑
                                              AI Agent / Cron      Ollama bge-m3
                                              (REST API)           (embedding)
```

## Roadmap

- [ ] Multi-user support
- [ ] RAG query endpoint (query → retrieve → synthesize)
- [ ] Webhook on new entry (notify agents)
- [ ] Plugin system for custom entry types
- [ ] Public sharing mode for selected entries

## License

MIT

---

Built by humans and AI agents, for humans and AI agents. 🤖🤝🧑
