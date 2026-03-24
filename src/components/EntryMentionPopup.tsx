"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface MentionEntry {
  id: number;
  title: string;
  type: string;
}

interface EntryMentionPopupProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (entry: MentionEntry) => void;
  onClose: () => void;
  activeIndex: number;
}

export default function EntryMentionPopup({ query, position, onSelect, onClose, activeIndex }: EntryMentionPopupProps) {
  const [results, setResults] = useState<MentionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Search entries
  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "8" });
      if (q.trim()) params.set("search", q.trim());
      params.set("sort", "newest");
      const res = await fetch(`/api/entries?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(
        (data.entries || []).map((e: { id: number; title: string; type: string }) => ({
          id: e.id,
          title: e.title,
          type: e.type,
        })),
      );
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Click outside → close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!popupRef.current) return;
    const item = popupRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const typeColors: Record<string, string> = {
    note: "#8b9dc3",
    research: "#6bc5a0",
    design: "#e4a0b7",
    product: "#c9a96e",
    opportunity: "#d4a843",
    reference: "#9ca3af",
  };

  return (
    <div
      ref={popupRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 100,
        width: 340,
        maxHeight: 280,
        overflowY: "auto",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        padding: "4px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px 6px",
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Link to entry
        {loading && (
          <Loader2
            style={{
              width: 12,
              height: 12,
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>

      {/* Results */}
      {results.length === 0 && !loading ? (
        <div
          style={{
            padding: "16px 12px",
            fontSize: "0.82rem",
            color: "var(--text-dim)",
            textAlign: "center",
          }}
        >
          {query ? "No entries found" : "Type to search..."}
        </div>
      ) : (
        results.map((entry, i) => (
          <button
            key={entry.id}
            data-index={i}
            onClick={() => onSelect(entry)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 12px",
              background: i === activeIndex ? "var(--surface-hover)" : "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
            }}
            onMouseLeave={(e) => {
              if (i !== activeIndex) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            {/* ID badge */}
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
                minWidth: 32,
              }}
            >
              #{entry.id}
            </span>

            {/* Title */}
            <span
              style={{
                fontSize: "0.84rem",
                color: "var(--text)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.title}
            </span>

            {/* Type badge */}
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                color: typeColors[entry.type] || "var(--text-dim)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              {entry.type}
            </span>
          </button>
        ))
      )}

      {/* Hints */}
      <div
        style={{
          padding: "6px 12px 8px",
          fontSize: "0.65rem",
          color: "var(--text-dim)",
          borderTop: "1px solid var(--border)",
          marginTop: 2,
          display: "flex",
          gap: 12,
        }}
      >
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>esc close</span>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
