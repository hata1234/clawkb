"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tag, Hash } from "lucide-react";

interface TagData {
  id: number;
  name: string;
  count: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => {
        setTags(data);
        setLoading(false);
      });
  }, []);

  const totalEntries = tags.reduce((sum, t) => sum + t.count, 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
          Organize
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>
          Tags
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 2 }}>
          {tags.length} tags · {totalEntries} tagged entries
        </p>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <Tag style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: "0.875rem" }}>No tags yet.</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 4 }}>
            Tags are created when you add them to entries.
          </p>
        </div>
      ) : (
        <div className="tags-grid">
          {tags.map((tag) => (
            <Link key={tag.id} href={`/entries?tag=${encodeURIComponent(tag.name)}`} style={{ textDecoration: "none" }}>
              <div className="tag-card card-hover">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: 8, background: "var(--accent-muted)", borderRadius: "var(--radius-sm)", flexShrink: 0 }}>
                    <Hash style={{ width: 16, height: 16, color: "var(--accent)" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tag.name}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {tag.count} {tag.count === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .tags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        @media (max-width: 640px) {
          .tags-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .tag-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px;
          cursor: pointer;
        }
        .tag-card:hover {
          border-color: var(--border-hover);
        }
      `}</style>
    </div>
  );
}
