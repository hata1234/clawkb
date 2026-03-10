"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";

interface RelatedEntry {
  id: number;
  title: string;
  type: string;
  source: string;
  summary: string | null;
  createdAt: string;
  similarity: number;
}

export default function RelatedEntries({ entryId }: { entryId: number }) {
  const [entries, setEntries] = useState<RelatedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/entries/${entryId}/related?limit=5`)
      .then((r) => r.ok ? r.json() : { related: [] })
      .then((data) => setEntries(data.related || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [entryId]);

  if (!loading && entries.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{
        fontSize: "0.7rem", fontWeight: 600, color: "var(--text-dim)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
      }}>
        Related Entries
      </h2>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{
              height: 72, borderRadius: "var(--radius-md)",
              background: "var(--surface)", border: "1px solid var(--border)",
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((e) => (
            <Link key={e.id} href={`/entries/${e.id}`} style={{ textDecoration: "none" }}>
              <div className="related-entry-card" style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s ease", cursor: "pointer",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: "0.7rem", color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}>
                      {Math.round(e.similarity * 100)}%
                    </span>
                  </div>
                  <div style={{
                    fontSize: "0.85rem", fontWeight: 500, color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {e.title}
                  </div>
                  <div style={{
                    fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2,
                    display: "flex", gap: 8,
                  }}>
                    <span>{e.source}</span>
                    <span>·</span>
                    <span>{formatRelativeDate(e.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .related-entry-card:hover {
          border-color: var(--accent) !important;
          background: rgba(201,169,110,0.04) !important;
        }
      `}</style>
    </div>
  );
}
