# Knowledge Hub — Full Stack Build Task

## Overview
Build a Knowledge Hub web application — a personal knowledge management system with a beautiful, modern UI. This is a Next.js 16 App Router project with PostgreSQL + pgvector for structured + vector search.

## Tech Stack (already installed)
- Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- PostgreSQL 17 + pgvector 0.8.2 (running on localhost:5432, database: `clawkb`)
- Prisma ORM
- NextAuth.js v5 (beta) with Credentials provider
- bcryptjs for password hashing
- react-markdown + remark-gfm for markdown rendering
- lucide-react for icons

## Database Connection
```
postgresql://user:password@localhost:5432/clawkb
```

## Database Schema (use Prisma)

### User
- id: Int (autoincrement)
- username: String (unique)
- passwordHash: String
- createdAt: DateTime

### Entry
- id: Int (autoincrement)
- type: String (opportunity | report | reference | project_note)
- source: String (nightly-recon | stock-daily | reddit | web | manual)
- title: String
- summary: String? (short summary)
- content: String? (full content, markdown)
- status: String (default: "new") — new | interested | in_progress | done | dismissed
- url: String?
- metadata: Json (default: {})
- createdAt: DateTime
- updatedAt: DateTime
- tags: Tag[] (many-to-many)

Note: Skip the vector/embedding column for now in Prisma schema. We'll add it via raw SQL migration later.

### Tag
- id: Int (autoincrement)
- name: String (unique)
- entries: Entry[] (many-to-many)

### Seed Data
Create a default admin user (username/password from `SEED_USERNAME`/`SEED_PASSWORD` env vars, bcrypt hash it).

## Auth Requirements
- NextAuth.js v5 Credentials provider
- Login page at `/login`
- All pages except `/login` require authentication (middleware)
- Session-based (JWT strategy is fine for single user)
- Also support Bearer token auth for API routes (check `Authorization: Bearer <token>` header)
- API token: use environment variable `API_TOKEN`

## Pages to Build

### 1. Login Page (`/login`)
- Clean, centered login form
- Username + password fields
- Dark themed, minimal
- Show error on invalid credentials

### 2. Dashboard (`/`)
- Stats cards at top:
  - Total entries count
  - Entries by type (pie/donut or just numbers)
  - Entries by status
  - This week's new entries count
- Recent entries list (latest 10)
- Each entry shows: type badge, title, source, date, status badge
- Click to go to detail page

### 3. Entries List (`/entries`)
- Filterable list with:
  - Type filter (dropdown or tabs)
  - Status filter
  - Source filter
  - Tag filter
  - Text search (searches title + summary)
- Sortable by date (newest/oldest)
- Pagination (20 per page)
- Each row: type badge, title, source, tags, status badge, date
- Click row → detail page
- "New Entry" button (opens create form)

### 4. Entry Detail (`/entries/[id]`)
- Full entry view
- Title, type, source, status, tags, dates
- Content rendered as markdown
- Summary shown separately if exists
- URL as clickable link
- Status dropdown to change status
- Notes/metadata section
- Edit button → inline edit mode
- Delete button (with confirmation)

### 5. New/Edit Entry (modal or separate page)
- Form: title, type, source, summary, content (textarea), url, tags, status
- Tags: comma-separated input or tag selector
- Content supports markdown (show preview)

## API Routes (for agent/cron integration)

### `POST /api/entries`
- Create new entry
- Auth: Bearer token
- Body: { type, source, title, summary?, content?, status?, url?, tags?: string[], metadata?: object }
- Returns created entry

### `GET /api/entries`
- List entries with filters
- Query params: type, status, source, tag, search, page, limit, sort
- Auth: Bearer token or session

### `GET /api/entries/[id]`
- Get single entry
- Auth: Bearer token or session

### `PATCH /api/entries/[id]`
- Update entry
- Auth: Bearer token or session

### `DELETE /api/entries/[id]`
- Delete entry
- Auth: Bearer token or session

### `GET /api/stats`
- Dashboard statistics
- Auth: Bearer token or session

### `POST /api/search`
- Semantic search endpoint (placeholder for now, will add vector search later)
- For now, just do text search on title + summary + content
- Auth: Bearer token or session

## UI Design Requirements — CRITICAL

### Design Philosophy
Modern, clean, dark-themed dashboard. Think Linear, Vercel Dashboard, or Raycast aesthetics.

### Color Scheme
- Background: near-black (`#0a0a0a` or similar)
- Cards/surfaces: dark gray (`#141414` to `#1a1a1a`)
- Borders: subtle (`#262626`)
- Primary accent: blue-purple gradient or electric blue (`#3b82f6`)
- Text: white/gray hierarchy (`#ffffff`, `#a1a1aa`, `#71717a`)
- Status colors:
  - new: blue
  - interested: amber/yellow
  - in_progress: purple
  - done: green
  - dismissed: gray

### Typography
- Use system font stack or Inter (if available via next/font)
- Clear hierarchy: large titles, medium subtitles, small metadata

### Components
- Cards with subtle borders and hover effects
- Smooth transitions/animations
- Status badges (colored pills)
- Type badges (with icons: 💡 opportunity, 📊 report, 📚 reference, 📝 project_note)
- Clean table/list views with hover states
- Responsive: works on mobile (sidebar collapses to hamburger)

### Layout
- Sidebar navigation (Dashboard, Entries, + future sections)
- Top bar with user info and logout
- Main content area with proper padding
- Sidebar: dark, icons + labels, active state highlight

## Environment Variables
See `.env.example` for all available variables.
```
DATABASE_URL="postgresql://user:password@localhost:5432/clawkb"
NEXTAUTH_SECRET="generate-a-random-32-char-string"
NEXTAUTH_URL="http://localhost:3500"
API_TOKEN="generate-a-random-token"
```

## Port
Run on port 3500: add to `package.json` scripts: `"dev": "next dev -p 3500"`

## File Structure Suggestion
```
src/
  app/
    layout.tsx          (root layout with sidebar)
    page.tsx            (dashboard)
    login/page.tsx
    entries/
      page.tsx          (list)
      [id]/page.tsx     (detail)
      new/page.tsx      (create)
    api/
      entries/
        route.ts
        [id]/route.ts
      stats/route.ts
      search/route.ts
      auth/[...nextauth]/route.ts
  components/
    Sidebar.tsx
    EntryCard.tsx
    EntryForm.tsx
    StatusBadge.tsx
    TypeBadge.tsx
    StatsCard.tsx
    Pagination.tsx
    SearchBar.tsx
    FilterBar.tsx
    MarkdownRenderer.tsx
  lib/
    prisma.ts           (prisma client singleton)
    auth.ts             (nextauth config)
    utils.ts
  prisma/
    schema.prisma
    seed.ts
```

## Important Notes
1. This is a SINGLE USER app. Don't over-engineer auth/permissions.
2. Dark theme ONLY. No light mode toggle needed.
3. Make it beautiful. This will potentially become a product.
4. Mobile responsive is important — owner views on phone often.
5. All text content may be in Traditional Chinese (繁體中文) or English — support both.
6. Markdown content should render nicely with proper code blocks, lists, headers, etc.

## After Building
1. Run `npx prisma generate` and `npx prisma db push`
2. Run seed script to create the boss user
3. Test `npm run dev` on port 3500
4. Verify login works
5. Verify CRUD operations work

When completely finished, run this command to notify:
openclaw system event --text "Done: Knowledge Hub MVP built — Next.js + PG + pgvector. Login, dashboard, entries CRUD, API all working." --mode now
