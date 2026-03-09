<p align="center">
  <img src="./public/logo-clawkb-wordmark.png" alt="ClawKB" width="360" />
</p>

# ClawKB

**A knowledge base built for Human–AI Agent collaboration.**

ClawKB lets humans and AI agents co-create, search, and manage knowledge entries through a clean web UI and a headless API. Designed for the [OpenClaw](https://github.com/openclaw/openclaw) ecosystem but works standalone.

English | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md)

## Features

- 📝 **Customizable entry types** — Default types included (opportunity, report, reference, project note); add, rename, or remove via Settings
- 🔍 **Hybrid search** — Vector (pgvector) + full-text (tsvector) + fuzzy (ILIKE) cascading pipeline, with a dedicated search page and ⌘K quick-search modal
- 📂 **Collections** — Hierarchical folders to organize entries into a tree structure
- 🏷️ **Tags & status tracking** — Filter, organize, and track entry lifecycle
- 💬 **Comments** — Per-entry comment threads for discussion and notes
- ⭐ **Favorites** — Star entries for quick access from the `/favorites` page
- 🗑️ **Soft delete & Trash** — Deleted entries go to trash; restore or permanently delete from `/trash` (admin)
- 📊 **Activity feed** — Automatic logging of all CRUD and comment actions, viewable at `/activity`
- 🕸️ **Knowledge graph** — Visual graph of entry relationships at `/graph`
- 📅 **Timeline** — Chronological view of entries at `/timeline`
- 🤖 **Agent-friendly API** — Bearer-token authenticated REST endpoints for cron jobs and AI agents
- 🖼️ **Image attachments** — Upload via any S3-compatible object storage (MinIO, AWS S3, Cloudflare R2, etc.)
- 📤 **Export** — CSV and JSON export with filters from the UI or API
- 🔒 **Multi-user auth** — Session-based login (NextAuth.js), user registration, role groups (admin/editor/viewer), per-user API tokens
- 🔌 **Plugin system** — Extensible hooks (`entry.serialize`, `entryCard.render`, `entry.afterQuery`) with built-in plugins:
  - **Backlinks** — Bi-directional link detection (`#id` and `/entries/id` references)
  - **Related Entries** — Discover semantically similar entries
  - **Auto-tag** — Automatic tag suggestions
  - **Entry Templates** — Predefined templates for new entries
  - **Export** — Extended export formats
- 📊 **Dashboard** — Stats overview with charts and recent entries
- ⚙️ **Settings** — Configure entry types, embedding provider, object storage, users, and plugins from the web UI
- 🌙 **Dark theme** — Editorial dark UI, responsive on mobile and desktop

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL 17+ with [pgvector](https://github.com/pgvector/pgvector) |
| ORM | Prisma |
| Embedding | Configurable — Ollama (bge-m3, nomic-embed, etc.), OpenAI, or any compatible endpoint |
| Auth | NextAuth.js (Credentials) |
| Object Storage | Any S3-compatible (MinIO, AWS S3, Cloudflare R2, etc.) |
| Styling | Tailwind CSS + CSS variables |
| Process Manager | PM2 |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 17+ with [pgvector](https://github.com/pgvector/pgvector) extension
- An embedding provider (Ollama, OpenAI, or compatible endpoint)

### Install

```bash
git clone https://github.com/openclaw/clawkb.git
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

### Docker

```bash
git clone https://github.com/openclaw/clawkb.git
cd clawkb

# (Optional) set secrets in .env — docker-compose reads from it
cp .env.example .env

docker compose up -d
# App at http://localhost:3500  (default user: admin / change-me-on-first-login)
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user@localhost:5432/clawkb` |
| `NEXTAUTH_SECRET` | Session encryption secret | (random string) |
| `NEXTAUTH_URL` | Public URL | `https://kb.example.com` |
| `API_TOKEN` | Global bearer token for agent API access | (random string) |
| **Embedding** | | |
| `EMBEDDING_PROVIDER` | Provider type | `ollama` or `openai` |
| `EMBEDDING_URL` | Embedding API endpoint | `http://localhost:11434` |
| `EMBEDDING_MODEL` | Model name | `bge-m3` or `text-embedding-3-small` |
| `EMBEDDING_API_KEY` | API key (required for OpenAI) | `sk-...` |
| **Object Storage (S3-compatible)** | | |
| `S3_ENDPOINT` | S3-compatible endpoint | `minio.example.com` or `s3.amazonaws.com` |
| `S3_ACCESS_KEY` | Access key | |
| `S3_SECRET_KEY` | Secret key | |
| `S3_BUCKET` | Bucket name | `clawkb` |
| `S3_PUBLIC_URL` | Public URL prefix for uploaded files | `https://minio.example.com/clawkb` |
| `S3_REGION` | Region (required for AWS S3) | `us-east-1` |

## Settings

ClawKB includes a built-in Settings page (`/settings`) where you can configure:

- **Entry Types** — Add, rename, or remove entry type categories
- **Embedding** — Switch between Ollama, OpenAI, or other providers; change model
- **Object Storage** — Configure S3-compatible storage connection
- **Users** — Manage users and role groups (admin)
- **API Tokens** — Create per-user API tokens for agent access
- **Plugins** — Enable/disable and configure plugins

## API

All API endpoints are under `/api/`. Access requires either a session cookie or `Authorization: Bearer <token>` header (global `API_TOKEN` or per-user token).

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Entries** | | |
| `GET` | `/api/entries` | List entries (filter by type, status, tags; pagination) |
| `POST` | `/api/entries` | Create entry (auto-generates embedding) |
| `GET` | `/api/entries/[id]` | Get single entry |
| `PATCH` | `/api/entries/[id]` | Update entry fields |
| `DELETE` | `/api/entries/[id]` | Soft-delete entry |
| **Search** | | |
| `POST` | `/api/search` | Hybrid search (vector + full-text + fuzzy) |
| **Collections** | | |
| `GET` | `/api/collections` | List collections tree |
| `POST` | `/api/collections` | Create collection |
| `PATCH` | `/api/collections/[id]` | Update collection |
| `DELETE` | `/api/collections/[id]` | Delete collection |
| **Comments** | | |
| `GET` | `/api/entries/[id]/comments` | List comments on entry |
| `POST` | `/api/entries/[id]/comments` | Add comment |
| **Favorites** | | |
| `GET` | `/api/favorites` | List starred entries |
| `POST` | `/api/favorites` | Toggle star on entry |
| **Activity** | | |
| `GET` | `/api/activity` | Activity feed |
| **Trash** | | |
| `GET` | `/api/trash` | List soft-deleted entries |
| `POST` | `/api/trash` | Restore or permanently delete |
| **Graph** | | |
| `GET` | `/api/graph` | Knowledge graph data |
| **Users & Tokens** | | |
| `GET` | `/api/users` | List users (admin) |
| `GET` | `/api/tokens` | List API tokens |
| `POST` | `/api/tokens` | Create API token |
| `DELETE` | `/api/tokens/[id]` | Revoke token |
| **Plugins** | | |
| `GET` | `/api/plugins` | List installed plugins |
| `PATCH` | `/api/plugins/[id]` | Enable/disable plugin |
| **Other** | | |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/tags` | List all tags |
| `GET` | `/api/export` | Export entries as CSV or JSON |
| `POST` | `/api/upload` | Upload image attachment |
| `GET` | `/api/settings` | Get current settings |
| `PATCH` | `/api/settings` | Update settings |

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
                                              AI Agent / Cron    Embedding Provider
                                              (REST API)         (Ollama / OpenAI)
                                                    ↓
                                              Plugin System
                                              (backlinks, auto-tag, templates, ...)
```

## Plugins

ClawKB supports a file-based plugin system. Plugins live in the `plugins/` directory and can hook into:

| Hook | Description |
|------|-------------|
| `entry.serialize` | Modify API response before sending |
| `entryCard.render` | Add badges/icons/indicators to entry cards |
| `entry.afterQuery` | Post-process batch queries |

### Built-in Plugins

| Plugin | Description |
|--------|-------------|
| `backlinks` | Scans `#id` and `/entries/id` references to build bi-directional links |
| `related-entries` | Finds semantically similar entries via embeddings |
| `auto-tag` | Suggests tags based on entry content |
| `entry-templates` | Predefined templates for common entry types |
| `export` | Extended export formats and options |

## Roadmap

- [ ] ACL permission system (custom groups + fine-grained read/edit/delete/create per type/entry)
- [ ] Revision diff viewer
- [ ] RAG query endpoint (query → retrieve → synthesize)
- [ ] Webhook on new entry (notify agents)
- [ ] Public sharing mode for selected entries

## License

MIT

---

Built by humans and AI agents, for humans and AI agents. 🤖🤝🧑
