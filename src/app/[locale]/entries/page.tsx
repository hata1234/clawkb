"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import EntryCard from "@/components/EntryCard";
import Pagination from "@/components/Pagination";
import { Link } from "@/i18n/navigation";
import { Search, Filter, FileText, X, Download } from "lucide-react";
import { SOURCE_OPTIONS, STATUS_OPTIONS } from "@/lib/utils";

interface Entry {
  id: number;
  type: string;
  source: string;
  title: string;
  summary?: string | null;
  status: string;
  createdAt: string;
  tags: { id: number; name: string }[];
  isFavorited?: boolean;
}

interface ApiResponse {
  entries: Entry[];
  total: number;
  totalPages: number;
}

const selectFilterStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
  width: "100%",
};

function EntriesPageInner() {
  const t = useTranslations("Entries");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize state from URL params
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [tag, setTag] = useState(searchParams.get("tag") || "");
  const [collectionId, setCollectionId] = useState(searchParams.get("collectionId") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [allTags, setAllTags] = useState<{ id: number; name: string }[]>([]);
  const [allCollections, setAllCollections] = useState<{ id: number; name: string }[]>([]);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (tag) params.set("tag", tag);
    if (collectionId) params.set("collectionId", collectionId);
    if (sort && sort !== "newest") params.set("sort", sort);

    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    // Use replaceState to avoid creating new history entries on every keystroke,
    // but pushState on page change so back button works for pagination
    window.history.replaceState(null, "", newUrl);
  }, [page, search, status, source, tag, collectionId, sort, pathname]);

  // Load available tags and collections for filter dropdowns
  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setAllTags)
      .catch(() => {});
    fetch("/api/collections")
      .then((r) => r.json())
      .then((data) => setAllCollections(data.flat || []))
      .catch(() => {});
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (tag) params.set("tag", tag);
    if (collectionId) params.set("collectionId", collectionId);
    if (sort === "oldest") params.set("sort", "oldest");
    params.set("page", String(page));
    params.set("limit", "20");
    const res = await fetch(`/api/entries?${params}`);
    const data: ApiResponse = await res.json();
    setEntries(data.entries);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [search, status, source, tag, collectionId, sort, page]);

  useEffect(() => {
    const timer = setTimeout(fetchEntries, 300);
    return () => clearTimeout(timer);
  }, [fetchEntries]);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setPage(parseInt(params.get("page") || "1", 10));
      setSearch(params.get("search") || "");
      setStatus(params.get("status") || "");
      setSource(params.get("source") || "");
      setTag(params.get("tag") || "");
      setCollectionId(params.get("collectionId") || "");
      setSort(params.get("sort") || "newest");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Sync state when searchParams change (e.g. sidebar collection click)
  useEffect(() => {
    const urlPage = parseInt(searchParams.get("page") || "1", 10);
    const urlSearch = searchParams.get("search") || "";
    const urlStatus = searchParams.get("status") || "";
    const urlSource = searchParams.get("source") || "";
    const urlTag = searchParams.get("tag") || "";
    const urlCollectionId = searchParams.get("collectionId") || "";
    const urlSort = searchParams.get("sort") || "newest";

    if (urlPage !== page) setPage(urlPage);
    if (urlSearch !== search) setSearch(urlSearch);
    if (urlStatus !== status) setStatus(urlStatus);
    if (urlSource !== source) setSource(urlSource);
    if (urlTag !== tag) setTag(urlTag);
    if (urlCollectionId !== collectionId) setCollectionId(urlCollectionId);
    if (urlSort !== sort) setSort(urlSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Push to history on page change (so back button navigates between pages)
  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams();
      if (newPage > 1) params.set("page", String(newPage));
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      if (tag) params.set("tag", tag);
      if (collectionId) params.set("collectionId", collectionId);
      if (sort && sort !== "newest") params.set("sort", sort);
      const qs = params.toString();
      const newUrl = qs ? `${pathname}?${qs}` : pathname;
      window.history.pushState(null, "", newUrl);
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [search, status, source, tag, collectionId, sort, pathname],
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setSource("");
    setTag("");
    setCollectionId("");
    setSort("newest");
    setPage(1);
  };

  const toggleFavorite = async (entryId: number) => {
    const res = await fetch(`/api/entries/${entryId}/favorite`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, isFavorited: data.favorited } : e)));
  };

  const hasFilters = search || status || source || tag || collectionId || sort !== "newest";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--text-dim)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {t("label")}
          </p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>
            {t("title")}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 2 }}>
            {t("total", { count: total })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (status) params.set("status", status);
              if (source) params.set("source", source);
              if (tag) params.set("tag", tag);
              params.set("format", "csv");
              window.open("/api/export?" + params.toString());
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-hover)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              fontSize: "0.8rem",
              fontWeight: 500,
              border: "1px solid var(--border)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            {t("csv")}
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (status) params.set("status", status);
              if (source) params.set("source", source);
              if (tag) params.set("tag", tag);
              params.set("format", "json");
              window.open("/api/export?" + params.toString());
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-hover)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              fontSize: "0.8rem",
              fontWeight: 500,
              border: "1px solid var(--border)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            {t("json")}
          </button>
        </div>
        <Link
          href="/entries/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            borderRadius: "var(--radius-md)",
            padding: "10px 16px",
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {t("newEntry")}
        </Link>
      </div>

      {/* Search + Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim().split(/\s+/).length >= 3) {
                e.preventDefault();
                router.push(`/search?q=${encodeURIComponent(search.trim())}`);
              }
            }}
            placeholder={t("searchPlaceholder")}
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              paddingLeft: 36,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: "0.875rem",
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: hasFilters ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: hasFilters ? "var(--accent-muted)" : "var(--surface)",
            color: hasFilters ? "var(--accent)" : "var(--text-secondary)",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Filter style={{ width: 16, height: 16 }} />
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="entries-filter-grid"
          style={{
            marginBottom: 16,
            padding: 16,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={selectFilterStyle}
          >
            <option value="">{t("allStatuses")}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            style={selectFilterStyle}
          >
            <option value="">{t("allSources")}</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              setPage(1);
            }}
            style={selectFilterStyle}
          >
            <option value="">{t("allTags")}</option>
            {allTags.map((tg) => (
              <option key={tg.id} value={tg.name}>
                {tg.name}
              </option>
            ))}
          </select>
          <select
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              setPage(1);
            }}
            style={selectFilterStyle}
          >
            <option value="">{t("allCollections")}</option>
            {allCollections.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            style={selectFilterStyle}
          >
            <option value="newest">{t("newestFirst")}</option>
            <option value="oldest">{t("oldestFirst")}</option>
          </select>
        </div>
      )}

      {/* Active tag badge */}
      {tag && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("filteredByTag")}</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
              background: "var(--accent-muted)",
              color: "var(--accent)",
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            #{tag}
            <button
              onClick={() => {
                setTag("");
                setPage(1);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </span>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                height: 80,
              }}
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <FileText style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: "0.875rem" }}>{t("noEntriesFound")}</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                color: "var(--accent)",
                fontSize: "0.875rem",
                marginTop: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {t("clearFilters")}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />

      <style>{`
        .entries-filter-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        @media (min-width: 640px) {
          .entries-filter-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        select { color-scheme: dark; }
        input:focus { border-color: var(--accent) !important; }
      `}</style>
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
          Loading...
        </div>
      }
    >
      <EntriesPageInner />
    </Suspense>
  );
}
