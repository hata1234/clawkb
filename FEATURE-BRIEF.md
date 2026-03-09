# ClawKB Feature Brief — Multi-user + Plugin System

## Current State
- Next.js 14 app with Prisma + PostgreSQL (pgvector)
- Single API token auth (SHA-256 hash, bearer token)
- NextAuth configured but only for basic session
- PM2 managed, port 3500
- Git: `github.com:hata1234/clawkb.git`, branch `main`, commit `1f904db`

## Feature 1: Multi-user System

### 1a. Role-based Permissions
- Roles: `admin`, `editor`, `viewer`
- Admin: full CRUD + user management + settings
- Editor: create/edit own entries, comment on others
- Viewer: read-only

### 1b. Role Groups
- Create role groups (e.g. "POD Team", "Recon Agents")
- Assign roles at group level
- Users inherit permissions from their group

### 1c. Author Display + Avatars
- Every entry shows who created it (author name + avatar)
- User profile with avatar upload (to MinIO)
- Author shown on entry cards and detail pages

### 1d. User Registration
- Registration page with username/email/password
- Email verification (optional, can be disabled in settings)
- Admin can approve/reject new registrations
- Admin can also directly create users

### 1e. Agent Registration API
- `POST /api/auth/register-agent` endpoint
- Accepts: agent name, API key (auto-generated), optional avatar URL
- Returns: agent user record + API token
- Agent users have a special `agent` flag
- Can authenticate via Bearer token (existing flow) or new agent-specific tokens

### 1f. Agent Skill (SKILL.md)
- Write a complete SKILL.md that teaches OpenClaw agents how to:
  - Register themselves via the API
  - Authenticate with their token
  - Create/edit entries
  - Upload images
  - Search and read entries
- Place at: `/Users/hata1234/clawd/skills/clawkb/SKILL.md`
- Include example commands and API reference

## Feature 2: Plugin System

### Architecture
- Plugin = a folder with a `manifest.json` + code
- Manifest declares: hooks it wants, permissions needed, UI components
- Hook points throughout the app:
  - `entry.beforeCreate` / `entry.afterCreate`
  - `entry.beforeUpdate` / `entry.afterUpdate`
  - `entry.beforeDelete`
  - `entry.render` (inject UI into entry detail)
  - `sidebar.register` (add sidebar items)
  - `api.register` (add API routes)
  - `settings.register` (add settings panels)
- Plugin manager in settings UI (install/enable/disable/remove)
- Plugins stored in `plugins/` directory

### Current "plugins" to migrate
- Auto-tag (currently hardcoded) → should become a built-in plugin
- Related entries (currently hardcoded) → should become a built-in plugin

### Plugin API
- Plugins get a context object with:
  - `prisma` — database access
  - `storage` — MinIO/S3 helpers
  - `embedding` — vector embedding helpers
  - `settings` — read/write settings
  - `auth` — current user info

## Technical Constraints
- Keep using Prisma (no raw SQL migrations that break schema)
- PostgreSQL 17
- MinIO for file storage (S3-compatible)
- Ollama bge-m3 for embeddings (192.168.0.85:11434)
- Must not break existing API token auth (backward compatible)
- Must not break existing entries/data

## File Structure
```
/Users/hata1234/clawd/projects/clawkb/app/
├── prisma/schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── entries/
│   │   ├── settings/
│   │   ├── login/
│   │   └── ...
│   ├── components/
│   ├── lib/
│   └── ...
├── public/
└── package.json
```

## Priority
1. Multi-user (1a-1d) first — this is the foundation
2. Agent registration (1e-1f) next
3. Plugin system (2) last — most complex

## Style
- Match existing dark theme (CSS variables, not Tailwind utility)
- Keep the current aesthetic (lobster-brain logo, gold/amber accent)
- Mobile responsive
