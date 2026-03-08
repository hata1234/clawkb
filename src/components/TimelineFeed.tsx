"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TypeBadge from "./TypeBadge";
import { formatRelativeDate } from "@/lib/utils";
import { TYPE_OPTIONS, SOURCE_OPTIONS } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Entry {
  id: number;
  type: string;
  source: string;
  title: string;
  summary?: string | null;
  status: string;
  createdAt: string;
  tags: { id: number; name: string }[];
}

interface ApiResponse {
  entries: Entry[];
  total: number;
  totalPages: number;
}

function groupByDate(entries: Entry[]): Map<string, Entry[]> {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(entry);
  }
  return groups;
}

export default function TimelineFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const fetchEntries = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
      });
      if (typeFilter) params.set("type", typeFilter);
      if (sourceFilter) params.set("source", sourceFilter);

      try {
        const res = await fetch(`/api/entries?${params}`);
        const data: ApiResponse = await res.json();
        if (append) {
          setEntries((prev) => [...prev, ...data.entries]);
        } else {
          setEntries(data.entries);
        }
        setHasMore(pageNum < data.totalPages);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [typeFilter, sourceFilter]
  );

  // Reset when filters change
  useEffect(() => {
    setPage(1);
    fetchEntries(1, false);
  }, [fetchEntries]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchEntries(next, true);
  };

  const dateGroups = groupByDate(entries);

  return (
    <div className="timeline-page">
      <h1 className="timeline-heading">Timeline</h1>

      {/* Filter chips */}
      <div className="timeline-filters">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="timeline-filter-select"
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="timeline-filter-select"
        >
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(typeFilter || sourceFilter) && (
          <button
            className="timeline-clear-btn"
            onClick={() => {
              setTypeFilter("");
              setSourceFilter("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="timeline-loading">
          <Loader2 className="timeline-spinner" />
        </div>
      )}

      {/* Timeline */}
      {!loading && entries.length === 0 && (
        <p className="timeline-empty">No entries found.</p>
      )}

      {!loading && entries.length > 0 && (
        <div className="timeline-container">
          {/* Vertical line (desktop only) */}
          <div className="timeline-line" />

          {Array.from(dateGroups.entries()).map(([dateLabel, groupEntries]) => (
            <div key={dateLabel} className="timeline-group">
              {/* Date label */}
              <div className="timeline-date-row">
                <div className="timeline-date-node" />
                <h2 className="timeline-date-label">{dateLabel}</h2>
              </div>

              {/* Cards */}
              {groupEntries.map((entry) => (
                <div key={entry.id} className="timeline-item">
                  <div className="timeline-node" />
                  <Link
                    href={`/entries/${entry.id}`}
                    className="timeline-card"
                  >
                    <div className="timeline-card-header">
                      <TypeBadge type={entry.type} />
                      <span className="timeline-card-source">
                        {entry.source}
                      </span>
                      <span className="timeline-card-time">
                        {formatRelativeDate(entry.createdAt)}
                      </span>
                    </div>
                    <h3 className="timeline-card-title">{entry.title}</h3>
                    {entry.summary && (
                      <p className="timeline-card-summary">
                        {entry.summary.length > 150
                          ? entry.summary.slice(0, 150) + "…"
                          : entry.summary}
                      </p>
                    )}
                    {entry.tags.length > 0 && (
                      <div className="timeline-card-tags">
                        {entry.tags.slice(0, 4).map((tag) => (
                          <span key={tag.id} className="timeline-tag">
                            {tag.name}
                          </span>
                        ))}
                        {entry.tags.length > 4 && (
                          <span className="timeline-tag-more">
                            +{entry.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && (
        <div className="timeline-load-more">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="timeline-load-btn"
          >
            {loadingMore ? (
              <>
                <Loader2 className="timeline-spinner-sm" /> Loading…
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}

      <style>{`
        .timeline-page {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 16px 64px;
        }
        .timeline-heading {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 400;
          color: var(--text);
          margin-bottom: 24px;
        }

        /* ═══ Filters ═══ */
        .timeline-filters {
          display: flex;
          gap: 8px;
          margin-bottom: 28px;
          flex-wrap: wrap;
          align-items: center;
        }
        .timeline-filter-select {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 7px 12px;
          font-size: 0.8rem;
          color: var(--text);
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .timeline-filter-select:hover,
        .timeline-filter-select:focus {
          border-color: var(--border-hover);
        }
        .timeline-clear-btn {
          background: var(--accent-muted);
          color: var(--accent);
          border: none;
          border-radius: var(--radius-sm);
          padding: 7px 14px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .timeline-clear-btn:hover {
          opacity: 0.8;
        }

        /* ═══ Loading ═══ */
        .timeline-loading {
          display: flex;
          justify-content: center;
          padding: 64px 0;
        }
        .timeline-spinner {
          width: 28px;
          height: 28px;
          color: var(--accent);
          animation: spin 1s linear infinite;
        }
        .timeline-spinner-sm {
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .timeline-empty {
          text-align: center;
          color: var(--text-muted);
          padding: 64px 0;
          font-size: 0.9rem;
        }

        /* ═══ Timeline Container ═══ */
        .timeline-container {
          position: relative;
          padding-left: 32px;
        }
        .timeline-line {
          position: absolute;
          left: 7px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--border);
        }

        /* ═══ Date Group ═══ */
        .timeline-group {
          margin-bottom: 8px;
        }
        .timeline-date-row {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding-top: 8px;
        }
        .timeline-date-node {
          position: absolute;
          left: -32px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          border: 3px solid var(--background);
          box-shadow: 0 0 0 2px var(--accent);
          z-index: 1;
        }
        .timeline-date-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* ═══ Timeline Item ═══ */
        .timeline-item {
          position: relative;
          margin-bottom: 12px;
        }
        .timeline-node {
          position: absolute;
          left: -28px;
          top: 20px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border-hover);
          z-index: 1;
        }

        /* ═══ Card ═══ */
        .timeline-card {
          display: block;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          text-decoration: none;
          transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }
        .timeline-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        .timeline-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .timeline-card-source {
          font-size: 0.75rem;
          color: var(--text-dim);
          font-weight: 500;
        }
        .timeline-card-time {
          font-size: 0.75rem;
          color: var(--text-dim);
          margin-left: auto;
        }
        .timeline-card-title {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          line-height: 1.4;
          margin: 0;
        }
        .timeline-card:hover .timeline-card-title {
          color: var(--accent);
        }
        .timeline-card-summary {
          font-size: 0.835rem;
          color: var(--text-secondary);
          line-height: 1.55;
          margin-top: 6px;
        }
        .timeline-card-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .timeline-tag {
          font-size: 0.7rem;
          background: var(--surface-hover);
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .timeline-tag-more {
          font-size: 0.7rem;
          color: var(--text-dim);
          padding: 2px 4px;
        }

        /* ═══ Load More ═══ */
        .timeline-load-more {
          display: flex;
          justify-content: center;
          padding: 24px 0 0;
        }
        .timeline-load-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 28px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .timeline-load-btn:hover:not(:disabled) {
          border-color: var(--border-hover);
          color: var(--text);
        }
        .timeline-load-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ═══ Mobile ═══ */
        @media (max-width: 640px) {
          .timeline-page {
            padding: 24px 12px 48px;
          }
          .timeline-heading {
            font-size: 1.5rem;
          }
          .timeline-container {
            padding-left: 0;
          }
          .timeline-line,
          .timeline-date-node,
          .timeline-node {
            display: none;
          }
          .timeline-date-label {
            font-size: 0.75rem;
          }
          .timeline-card {
            padding: 14px;
          }
          .timeline-card-tags {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
