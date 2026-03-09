"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

interface ActivityItem {
  id: number;
  action: string;
  entryId: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

const ACTION_ICONS: Record<string, string> = {
  "entry.created": "\ud83d\udcdd",
  "entry.updated": "\u270f\ufe0f",
  "entry.deleted": "\ud83d\uddd1\ufe0f",
  "entry.restored": "\u267b\ufe0f",
  "comment.created": "\ud83d\udcac",
};

const ACTION_LABELS: Record<string, string> = {
  "entry.created": "created an entry",
  "entry.updated": "updated an entry",
  "entry.deleted": "deleted an entry",
  "entry.restored": "restored an entry",
  "comment.created": "commented on an entry",
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/activity?page=${page}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Feed</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>Activity</h1>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Loader2 style={{ width: 24, height: 24, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "0.875rem" }}>No activity yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {items.map((item) => {
            const icon = ACTION_ICONS[item.action] || "\u2022";
            const label = ACTION_LABELS[item.action] || item.action;
            const title = (item.metadata as Record<string, unknown>)?.title as string
              || (item.metadata as Record<string, unknown>)?.entryTitle as string
              || null;

            return (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0, width: 28, textAlign: "center", lineHeight: "24px" }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {item.actor && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 999, overflow: "hidden", background: "var(--accent-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>
                          {item.actor.avatarUrl
                            ? <img src={item.actor.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : item.actor.displayName.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text)" }}>{item.actor.displayName}</span>
                      </span>
                    )}
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{label}</span>
                  </div>
                  {title && item.entryId && (
                    <Link href={`/entries/${item.entryId}`} style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none", marginTop: 2, display: "inline-block" }}>
                      {title}
                    </Link>
                  )}
                  {title && !item.entryId && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 2, display: "inline-block" }}>
                      {title}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {formatRelativeDate(item.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: "6px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", cursor: page > 1 ? "pointer" : "default", opacity: page <= 1 ? 0.4 : 1, fontSize: "0.8rem" }}>
            Previous
          </button>
          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "flex", alignItems: "center" }}>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: "6px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", cursor: page < totalPages ? "pointer" : "default", opacity: page >= totalPages ? 0.4 : 1, fontSize: "0.8rem" }}>
            Next
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
