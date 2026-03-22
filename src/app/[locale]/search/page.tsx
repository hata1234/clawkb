"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import StatusBadge from "@/components/StatusBadge";
import { Search, Filter, X, FileText, Sparkles, Type, TextSearch, Loader2 } from "lucide-react";
import { STATUS_OPTIONS, formatRelativeDate } from "@/lib/utils";

interface SearchResult {
  id: number;
  type: string;
  source: string;
  title: string;
  summary?: string | null;
  status: string;
  url?: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: number; name: string }[];
  collections: { id: number; name: string; icon?: string | null; color?: string | null }[];
  author?: { id: number; displayName: string; avatarUrl: string | null } | null;
  snippet?: string | null;
  highlightedTitle?: string | null;
  highlightedSummary?: string | null;
  similarity?: number | null;
  rank?: number | null;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  mode: string;
  total: number;
}

const selectStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: "0.8rem",
  color: "var(--text)",
  outline: "none",
  width: "100%",
};

// Sanitize highlighted HTML - only allow <mark> tags from our server
// This is safe because we strip all HTML tags except <mark> which is harmless
function sanitizeHighlight(html: string): string {
  return html.replace(/<(?!\/?mark\b)[^>]*>/gi, "");
}

function SearchPageInner() {
  const t = useTranslations('Search');
  const tc = useTranslations('Common');
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const MODE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    vector: { label: t('modeSemantic'), icon: <Sparkles style={{ width: 12, height: 12 }} />, color: "var(--type-opportunity)" },
    fulltext: { label: t('modeFulltext'), icon: <TextSearch style={{ width: 12, height: 12 }} />, color: "var(--type-reference)" },
    ilike: { label: t('modeKeyword'), icon: <Type style={{ width: 12, height: 12 }} />, color: "var(--type-report)" },
    none: { label: t('modeNone'), icon: null, color: "var(--text-dim)" },
  };

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchMode, setSearchMode] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [type, setType] = useState(searchParams.get("type") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [tag, setTag] = useState(searchParams.get("tag") || "");
  const [collectionId, setCollectionId] = useState(searchParams.get("collectionId") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [mode, setMode] = useState(searchParams.get("mode") || "auto");

  const [allTags, setAllTags] = useState<{ id: number; name: string }[]>([]);
  const [allCollections, setAllCollections] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setAllTags).catch(() => {});
    fetch("/api/collections").then((r) => r.json()).then((data) => setAllCollections(data.flat || [])).catch(() => {});
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-search from URL params on mount
  useEffect(() => {
    if (searchParams.get("q")) {
      doSearch(searchParams.get("q")!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateURL = useCallback((q: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (tag) params.set("tag", tag);
    if (collectionId) params.set("collectionId", collectionId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (mode && mode !== "auto") params.set("mode", mode);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");
  }, [type, status, tag, collectionId, dateFrom, dateTo, mode]);

  const doSearch = useCallback(async (q?: string) => {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    updateURL(searchQuery);

    try {
      const body: Record<string, unknown> = {
        query: searchQuery,
        limit: 30,
      };
      if (mode && mode !== "auto") body.mode = mode;
      if (type) body.type = type;
      if (status) body.status = status;
      if (tag) body.tags = [tag];
      if (collectionId) body.collectionId = collectionId;
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: SearchResponse = await res.json();
      setResults(data.results);
      setSearchMode(data.mode);
      setTotal(data.total);
    } catch {
      setResults([]);
      setSearchMode("none");
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, mode, type, status, tag, collectionId, dateFrom, dateTo, updateURL]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      doSearch();
    }
  };

  const clearFilters = () => {
    setType(""); setStatus(""); setTag(""); setCollectionId("");
    setDateFrom(""); setDateTo(""); setMode("auto");
  };

  const hasFilters = type || status || tag || collectionId || dateFrom || dateTo || mode !== "auto";
  const modeInfo = MODE_LABELS[searchMode] || MODE_LABELS.none;

  return (
    <div className="search-page">
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{t('label')}</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 400, color: "var(--text)" }}>{t('title')}</h1>
      </div>

      {/* Search bar */}
      <div style={{ maxWidth: 720, margin: "0 auto 24px" }}>
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            className="search-input"
          />
          {loading && (
            <Loader2 className="search-spinner" />
          )}
          {!loading && query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setHasSearched(false); updateURL(""); inputRef.current?.focus(); }}
              className="search-clear-btn"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>

        {/* Filter toggle + mode indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6,
                border: hasFilters ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: hasFilters ? "var(--accent-muted)" : "transparent",
                color: hasFilters ? "var(--accent)" : "var(--text-secondary)",
                fontSize: "0.8rem", cursor: "pointer",
              }}
            >
              <Filter style={{ width: 14, height: 14 }} />
              {t('filters')}
            </button>
            {hasFilters && (
              <button onClick={clearFilters} style={{
                fontSize: "0.75rem", color: "var(--text-dim)", background: "none",
                border: "none", cursor: "pointer", textDecoration: "underline",
              }}>
                {tc('clear')}
              </button>
            )}
          </div>
          {hasSearched && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-dim)" }}>
              <span>{t('results', { count: total })}</span>
              {searchMode && searchMode !== "none" && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 999, fontSize: "0.7rem",
                  background: `color-mix(in srgb, ${modeInfo.color} 15%, transparent)`,
                  color: modeInfo.color, fontWeight: 500,
                }}>
                  {modeInfo.icon} {modeInfo.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="search-filters" style={{ maxWidth: 720, margin: "0 auto 24px" }}>
          <div className="search-filters-grid">
            <div>
              <label className="search-filter-label">{t('status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
                <option value="">{t('allStatuses')}</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="search-filter-label">{t('tag')}</label>
              <select value={tag} onChange={(e) => setTag(e.target.value)} style={selectStyle}>
                <option value="">{t('allTags')}</option>
                {allTags.map((tg) => <option key={tg.id} value={tg.name}>{tg.name}</option>)}
              </select>
            </div>
            <div>
              <label className="search-filter-label">{t('collection')}</label>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} style={selectStyle}>
                <option value="">{t('allCollections')}</option>
                {allCollections.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="search-filter-label">{t('from')}</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={selectStyle} />
            </div>
            <div>
              <label className="search-filter-label">{t('to')}</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={selectStyle} />
            </div>
            <div>
              <label className="search-filter-label">{t('searchMode')}</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={selectStyle}>
                <option value="auto">{t('auto')}</option>
                <option value="vector">{t('semantic')}</option>
                <option value="ilike">{t('keyword')}</option>
              </select>
            </div>
          </div>
          {hasFilters && (
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button onClick={() => doSearch()} style={{
                padding: "6px 16px", borderRadius: 6,
                background: "var(--accent)", color: "var(--accent-contrast)",
                border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              }}>
                {t('applyFilters')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: 20, height: 120,
              }} />
            ))}
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <FileText style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontSize: "1rem", fontWeight: 500, marginBottom: 8 }}>{t('noResults')}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
              {t('noResultsHint')}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((result) => (
              <SearchResultCard key={result.id} result={result} searchMode={searchMode} modeLabels={MODE_LABELS} />
            ))}
          </div>
        )}

        {/* Initial state */}
        {!hasSearched && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <Search style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.2 }} />
            <p style={{ fontSize: "1rem", fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>
              {t('initialTitle')}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
              {t('initialHint')}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 16 }}>
              {t('tip')}
            </p>
          </div>
        )}
      </div>

      <style>{`
        .search-page {
          padding-bottom: 40px;
        }
        .search-input {
          width: 100%;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 14px 48px 14px 48px;
          font-size: 1rem;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s ease;
          box-sizing: border-box;
        }
        .search-input:focus {
          border-color: var(--accent);
        }
        .search-input::placeholder {
          color: var(--text-dim);
        }
        .search-spinner {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--text-dim);
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }
        .search-clear-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .search-clear-btn:hover {
          color: var(--text);
          background: var(--surface-hover);
        }
        .search-filters {
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .search-filters-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .search-filters-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .search-filter-label {
          display: block;
          font-size: 0.7rem;
          color: var(--text-dim);
          margin-bottom: 4px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .search-result-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          text-decoration: none;
          display: block;
          transition: border-color 0.15s ease;
        }
        .search-result-card:hover {
          border-color: var(--border-hover);
        }
        .search-result-card:hover .sr-title {
          color: var(--accent);
        }
        .sr-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .sr-title {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          transition: color 0.15s ease;
          margin-bottom: 4px;
        }
        .sr-title mark {
          background: color-mix(in srgb, var(--accent) 30%, transparent);
          color: var(--accent);
          border-radius: 2px;
          padding: 0 2px;
        }
        .sr-snippet {
          font-size: 0.83rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 10px;
        }
        .sr-snippet mark {
          background: color-mix(in srgb, var(--accent) 30%, transparent);
          color: var(--accent);
          border-radius: 2px;
          padding: 0 2px;
        }
        .sr-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sr-meta-item {
          font-size: 0.72rem;
          color: var(--text-dim);
          font-weight: 500;
        }
        .sr-meta-dot {
          font-size: 0.72rem;
          color: var(--text-dim);
        }
        .sr-tag {
          font-size: 0.68rem;
          background: var(--surface-hover);
          color: var(--text-secondary);
          padding: 1px 7px;
          border-radius: 999px;
        }
        .sr-score {
          font-size: 0.68rem;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .sr-collection-pill {
          font-size: 0.65rem;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 1px 7px;
          border-radius: 999px;
          white-space: nowrap;
          font-weight: 500;
        }
        select, input[type="date"] { color-scheme: dark; }
      `}</style>
    </div>
  );
}

function SearchResultCard({ result, searchMode, modeLabels }: { result: SearchResult; searchMode: string; modeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> }) {
  const modeInfo = modeLabels[searchMode] || modeLabels.none;

  // NOTE: sanitizeHighlight strips all HTML except <mark> tags, making this safe
  // for rendering server-provided search highlights
  return (
    <Link href={`/entries/${result.id}`} className="search-result-card">
      <div className="sr-header">
        <StatusBadge status={result.status} />
        {result.similarity != null && (
          <span className="sr-score" style={{
            background: `color-mix(in srgb, ${modeInfo.color} 15%, transparent)`,
            color: modeInfo.color,
          }}>
            {result.similarity}% match
          </span>
        )}
      </div>
      <h3
        className="sr-title"
        dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.highlightedTitle || result.title) }}
      />
      {(result.highlightedSummary || result.snippet) && (
        <p
          className="sr-snippet"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.highlightedSummary || result.snippet || "") }}
        />
      )}
      <div className="sr-meta">
        {result.author && (
          <>
            <span className="sr-meta-item">{result.author.displayName}</span>
            <span className="sr-meta-dot">&middot;</span>
          </>
        )}
        <span className="sr-meta-item">{result.source}</span>
        <span className="sr-meta-dot">&middot;</span>
        <span className="sr-meta-item">{formatRelativeDate(result.createdAt)}</span>
        {result.collections && result.collections.length > 0 && (
          <>
            <span className="sr-meta-dot">&middot;</span>
            {result.collections.slice(0, 2).map((col) => (
              <span key={col.id} className="sr-collection-pill" style={col.color ? { borderColor: col.color, color: col.color } : undefined}>
                {col.icon || "\uD83D\uDCC1"} {col.name}
              </span>
            ))}
          </>
        )}
        {result.tags.length > 0 && (
          <>
            <span className="sr-meta-dot">&middot;</span>
            {result.tags.slice(0, 3).map((tg) => (
              <span key={tg.id} className="sr-tag">{tg.name}</span>
            ))}
            {result.tags.length > 3 && (
              <span className="sr-meta-item">+{result.tags.length - 3}</span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
