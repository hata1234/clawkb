"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Sparkles, Type, TextSearch, Loader2, ArrowRight } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

interface QuickResult {
  id: number;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  similarity?: number | null;
}

interface SearchResponse {
  results: QuickResult[];
  query: string;
  mode: string;
  total: number;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  vector: <Sparkles style={{ width: 10, height: 10 }} />,
  fulltext: <TextSearch style={{ width: 10, height: 10 }} />,
  ilike: <Type style={{ width: 10, height: 10 }} />,
};

const TYPE_DOTS: Record<string, string> = {
  opportunity: "var(--type-opportunity)",
  report: "var(--type-report)",
  reference: "var(--type-reference)",
  project_note: "var(--type-project)",
};

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [searchMode, setSearchMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchMode("");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim(), limit: 8 }),
        });
        const data: SearchResponse = await res.json();
        setResults(data.results);
        setSearchMode(data.mode);
        setSelectedIdx(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const navigateTo = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const itemCount = results.length + (query.trim() ? 1 : 0); // +1 for "View all" action
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % itemCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + itemCount) % itemCount);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx < results.length) {
        navigateTo(`/entries/${results[selectedIdx].id}`);
      } else if (query.trim()) {
        navigateTo(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="cmdk-backdrop" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="cmdk-modal">
        {/* Input */}
        <div className="cmdk-input-wrap">
          <Search style={{ width: 18, height: 18, color: "var(--text-dim)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search entries..."
            className="cmdk-input"
          />
          {loading && <Loader2 className="cmdk-spinner" />}
          <kbd className="cmdk-kbd">ESC</kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="cmdk-results">
            {results.length === 0 && !loading && (
              <div className="cmdk-empty">
                <FileText style={{ width: 20, height: 20, opacity: 0.3 }} />
                <span>No results</span>
              </div>
            )}
            {results.map((r, i) => (
              <button
                key={r.id}
                className={`cmdk-item ${i === selectedIdx ? "selected" : ""}`}
                onClick={() => navigateTo(`/entries/${r.id}`)}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span className="cmdk-dot" style={{ background: TYPE_DOTS[r.type] || "var(--text-dim)" }} />
                <span className="cmdk-item-title">{r.title}</span>
                <span className="cmdk-item-meta">{formatRelativeDate(r.createdAt)}</span>
              </button>
            ))}
            {query.trim() && (
              <button
                className={`cmdk-item cmdk-view-all ${selectedIdx === results.length ? "selected" : ""}`}
                onClick={() => navigateTo(`/search?q=${encodeURIComponent(query.trim())}`)}
                onMouseEnter={() => setSelectedIdx(results.length)}
              >
                <Search style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                  Search for &ldquo;{query.trim()}&rdquo;
                </span>
                <ArrowRight style={{ width: 14, height: 14, color: "var(--accent)", marginLeft: "auto", flexShrink: 0 }} />
              </button>
            )}
            {searchMode && results.length > 0 && (
              <div className="cmdk-mode-indicator">
                {MODE_ICONS[searchMode]} {searchMode} search
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .cmdk-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 100;
        }
        .cmdk-modal {
          position: fixed;
          top: min(20vh, 160px);
          left: 50%;
          transform: translateX(-50%);
          width: min(560px, calc(100vw - 32px));
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          z-index: 101;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .cmdk-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }
        .cmdk-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-size: 0.95rem;
          color: var(--text);
        }
        .cmdk-input::placeholder {
          color: var(--text-dim);
        }
        .cmdk-spinner {
          width: 16px;
          height: 16px;
          color: var(--text-dim);
          animation: cmdk-spin 1s linear infinite;
          flex-shrink: 0;
        }
        @keyframes cmdk-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .cmdk-kbd {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--background);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: inherit;
          flex-shrink: 0;
        }
        .cmdk-results {
          max-height: 360px;
          overflow-y: auto;
          padding: 6px;
        }
        .cmdk-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px;
          color: var(--text-dim);
          font-size: 0.85rem;
        }
        .cmdk-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          color: var(--text);
          font-size: 0.85rem;
          transition: background 0.1s ease;
        }
        .cmdk-item.selected,
        .cmdk-item:hover {
          background: var(--surface-hover);
        }
        .cmdk-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .cmdk-item-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .cmdk-item-meta {
          font-size: 0.72rem;
          color: var(--text-dim);
          flex-shrink: 0;
        }
        .cmdk-view-all {
          border-top: 1px solid var(--border);
          margin-top: 4px;
          padding-top: 10px;
          border-radius: 0 0 6px 6px;
        }
        .cmdk-mode-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          font-size: 0.65rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </>
  );
}
