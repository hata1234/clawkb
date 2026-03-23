# ClawKB Code Quality Audit Report

**Date:** 2026-03-24
**Auditor:** クロジャン
**Scope:** `/Users/hata1234/clawd/projects/clawkb/app` — 165 TypeScript files, 22,678 LOC, 6 plugin files

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟡 Warning | 12 |
| 🔵 Info | 8 |

**Overall:** 程式碼品質中上。TypeScript 零型別錯誤、零 `@ts-ignore`、只有 1 處 `any`。Build 只有 1 個 warning。主要問題集中在 **ACL 覆蓋不完整**、**inline style 泛濫**、以及 **silent error swallowing**。

---

## 1. Build & TypeScript

### ✅ TypeScript 零錯誤
`tsc --noEmit` 完全通過，沒有型別錯誤。

### ⚠️ Build Warning (1)

| File | Severity | Description |
|------|----------|-------------|
| `src/middleware.ts` | 🟡 Warning | `"middleware"` file convention is deprecated — Next.js 16 建議改用 `"proxy"` |

---

## 2. Security — ACL 覆蓋缺口

| File | Severity | Description |
|------|----------|-------------|
| `src/app/api/stats/route.ts` | 🔴 Critical | Stats API 查詢全部 entries，不受 collection ACL 限制。非 admin 使用者可看到受限 collection 的統計數據。 |
| `src/app/api/graph/route.ts` | 🔴 Critical | Knowledge Graph API 用 raw SQL 查詢 entries，完全沒有 collection ACL 過濾，可洩漏受限文章的 title/type/source/summary。 |
| `src/app/api/entries/[id]/related/route.ts` | 🟡 Warning | Related entries API 用 embedding 向量搜尋，沒有 ACL 過濾，可能回傳受限 collection 的文章。 |
| `src/app/api/auth/forgot-password/route.ts` | 🟡 Warning | 沒有 rate limiting，可被用來暴力觸發密碼重設信件（雖然有防列舉處理）。 |

---

## 3. Hardcoded Values

| File | Line | Severity | Description |
|------|------|----------|-------------|
| `src/lib/settings.ts` | 69 | 🔴 Critical | `baseUrl: "http://192.168.1.113:8888/v1"` 寫死在 `DEFAULT_RAG` — open-source 使用者會拿到你的內網 IP 作為預設值。應改為 `process.env.RAG_BASE_URL \|\| "http://localhost:8888/v1"` |
| `src/app/api/entries/[id]/share/route.ts` | 71, 109 | 🟡 Warning | `localhost:3500` 作為 fallback 可接受，但 4 處重複定義。建議提取為共用常量。 |

---

## 4. Code Style 一致性

### Quote Style — 混用

| Style | Count | Files |
|-------|-------|-------|
| Double quotes (`"`) | 555 imports | 大多數檔案 |
| Single quotes (`'`) | 68 imports | 38 個檔案 |

**建議:** 專案主流是 double quotes。38 個用 single quote 的檔案大多是 settings、i18n 相關頁面，看起來是不同 session 的 sub-agent 寫的。應統一。

### Semicolons — ✅ 一致
基本上全部有 semicolons，沒有明顯遺漏。

### `eslint-disable` — 4 處
全部是 `react-hooks/exhaustive-deps`（entries page、search page、KnowledgeGraph），可以接受但建議逐一確認是否真的不需要。

### `any` 使用 — 1 處
`src/components/BpmnEditor.tsx:111` — `let bpmnInstance: any = null` — BPMN.js 沒有 TypeScript 型別定義，合理。

---

## 5. Inline Styles 泛濫

| Metric | Count |
|--------|-------|
| `style={{` 總數 | **1,236** 處 |
| `fontWeight: 500` 重複 | 66 處 |
| `fontSize: "0.875rem"` 重複 | 86 處 |
| `cursor: "pointer"` 重複 | 86 處 |

**嚴重程度:** 🟡 Warning

這是目前最大的可維護性問題。幾乎所有 UI 都用 inline style 而非 CSS classes。同一組 style（button base、label、card 等）在不同檔案重複定義數十次。

**建議:**
1. 提取常用 style patterns 為 CSS utility classes 或 CSS modules
2. 至少把重複的 button/label/card style 定義為共用 const
3. Settings 頁面（SettingsClient、RagSettingsClient、SmtpSettingsClient、WebhooksClient）各自定義幾乎一樣的 `sectionTitle`、`inputStyle`、`btnPrimary` 等，應抽成共用

---

## 6. Silent Error Swallowing

**共 37 處 bare `catch {}`**，沒有 log 也沒有 user feedback：

| Category | Count | Key Files |
|----------|-------|-----------|
| Client-side fetch catch | 18 | settings pages, export, search, rag, bpmn |
| Server-side silent catch | 7 | webhooks.ts, plugins/manager.ts, settings.ts, activity.ts |
| Stream/SSE catch | 6 | rag/route.ts, notifications/stream, FloatingChat, NotificationBell |
| Intentional ignore | 6 | JSON parse fallbacks, stream close |

**建議:**
- Client-side: 至少 `catch (err) { setError(err.message) }` 或 toast notification
- Server-side: `catch (err) { console.error(...) }` — silent failures 在 webhooks 尤其危險
- Stream close 的 catch 可以 ignore（已標註 `/* already closed */`）

---

## 7. console.error 使用 — ✅ 合理

22 處 `console.error`，全部在 server-side error paths（embedding、email、notifications、RAG、upload）。**沒有任何 `console.log` 殘留。** 很乾淨。

---

## 8. Dead Code & Commented-Out Code

| Pattern | Count | Notes |
|---------|-------|-------|
| Comment lines (non-doc) | 291 | 大部分是說明性註解，少量是 disabled code |
| Deleted files from ACL refactor | 已清理 | `src/app/api/roles/*` 和 `settings/roles/*` 已刪除 ✅ |

**沒有發現明顯的大段 dead code。** 之前的 ACL 重構清理得很乾淨。

---

## 9. Plugin Code Quality (`plugins/*.mjs`)

| File | Severity | Issue |
|------|----------|-------|
| `plugins/export/server.mjs` | ✅ Fixed | ACL 已在本次修復 |
| All plugins | 🟡 Warning | Plain `.mjs` 沒有型別檢查，只能靠 runtime 發現錯誤 |
| `plugins/entry-templates/server.mjs` | 🔵 Info | 用 `context.principal.effectiveRole !== "admin"` — 但 ACL 重構後 principal 已改為 `isAdmin` boolean，需確認是否 break |

---

## 10. i18n Coverage

| Pattern | Count |
|---------|-------|
| Hardcoded UI strings (非 i18n) | ~10 處 |

主要在 `groups-client.tsx`（"Error" fallback）、`bpmn/[entryId]/page.tsx`（"Entry not found"、"Failed to load entry"）、`KnowledgeGraph.tsx`（"Failed to fetch graph data"）。

---

## 11. Miscellaneous

| Item | Severity | Description |
|------|----------|-------------|
| Middleware deprecation | 🟡 Warning | Next.js 16 warns `middleware` → `proxy`，但目前功能正常 |
| `$queryRaw` usage | 🔵 Info | 2 處（`page.tsx` L37, L47），使用 tagged template（Prisma 安全），非 string interpolation，OK |
| `eslint-disable` | 🔵 Info | 4 處 exhaustive-deps，可接受 |
| No `.eslintrc` | 🔵 Info | 專案沒有 ESLint 配置檔，只靠 Next.js 內建 |
| No Prettier config | 🔵 Info | 沒有 `.prettierrc`，解釋了 quote style 不一致 |
| `NEXTAUTH_SECRET` in `.env` | 🔵 Info | `.env` 有 `"change-me-in-production"`，`.env.local` 有實際值，`.env.example` 有提示。OK but `.env` 不該 commit（已在 .gitignore？） |
| entry-templates plugin | 🟡 Warning | 用舊的 `effectiveRole` 欄位，ACL 重構後可能壞掉 |

---

## Recommendations（優先順序）

### P0 — 立即修
1. **`settings.ts` hardcoded IP** → 改為 env var fallback `localhost`
2. **`stats/route.ts` + `graph/route.ts` ACL** → 加 `getAccessibleCollectionIds` 過濾
3. **確認 `entry-templates` plugin** 的 `effectiveRole` 是否還能正常工作

### P1 — 短期改善
4. **Inline styles 提取** → 先從 settings 頁面開始，定義共用 style constants
5. **Silent catch blocks** → 至少加 `console.error` 或 user-facing error message
6. **Quote style 統一** → 加 Prettier config（`"singleQuote": false`），一次性 format

### P2 — 中期
7. **ESLint + Prettier 設定** → `.eslintrc.json` + `.prettierrc` + `lint-staged` hook
8. **Related entries ACL** → embedding search 結果也要過濾
9. **Rate limiting** → forgot-password + register endpoints
10. **Middleware → Proxy** migration（Next.js 16 deprecation）

### P3 — Nice to Have
11. Plugin TypeScript 化（.mjs → .ts）
12. CSS modules 或 Tailwind 取代 inline styles
13. Error boundary component for client-side pages
