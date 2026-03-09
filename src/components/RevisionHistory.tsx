"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Revision {
  id: number;
  title: string;
  summary: string | null;
  content: string | null;
  status: string;
  type: string;
  source: string;
  tags: string[];
  editNote: string | null;
  createdAt: string;
  author: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

interface RevisionHistoryProps {
  entryId: number;
  currentTitle: string;
}

export default function RevisionHistory({ entryId, currentTitle }: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [expandedRevision, setExpandedRevision] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/entries/${entryId}/revisions`)
      .then((res) => (res.ok ? res.json() : { revisions: [] }))
      .then((data) => setRevisions(data.revisions || []));
  }, [entryId]);

  if (revisions.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: "20px 24px",
        marginTop: 16,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <History style={{ width: 14, height: 14, color: "var(--text-dim)" }} />
        <h2
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--text-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: 0,
          }}
        >
          Revision History ({revisions.length})
        </h2>
        {expanded ? (
          <ChevronUp style={{ width: 14, height: 14, color: "var(--text-dim)", marginLeft: "auto" }} />
        ) : (
          <ChevronDown style={{ width: 14, height: 14, color: "var(--text-dim)", marginLeft: "auto" }} />
        )}
      </button>

      {expanded && (
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {revisions.map((rev, idx) => {
            const isExpanded = expandedRevision === rev.id;
            const titleChanged = rev.title !== currentTitle;
            return (
              <div
                key={rev.id}
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                }}
              >
                <button
                  onClick={() => setExpandedRevision(isExpanded ? null : rev.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-mono)",
                        flexShrink: 0,
                      }}
                    >
                      v{revisions.length - idx}
                    </span>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "var(--accent-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent)",
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {rev.author?.avatarUrl ? (
                        <img
                          src={rev.author.avatarUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        rev.author?.displayName?.charAt(0).toUpperCase() || "?"
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rev.author?.displayName || "Unknown"}
                    </span>
                    {rev.editNote && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-dim)",
                          fontStyle: "italic",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        — {rev.editNote}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", flexShrink: 0 }}>
                    {formatDate(rev.createdAt)}
                  </span>
                </button>

                {isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "grid", gap: 8, fontSize: "0.82rem" }}>
                      <div>
                        <span style={{ color: "var(--text-dim)" }}>Title: </span>
                        <span style={{ color: titleChanged ? "var(--accent)" : "var(--text-secondary)" }}>
                          {rev.title}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-dim)" }}>Status: </span>
                        <span style={{ color: "var(--text-secondary)" }}>{rev.status}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-dim)" }}>Tags: </span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {rev.tags.length > 0 ? rev.tags.join(", ") : "—"}
                        </span>
                      </div>
                      {rev.summary && (
                        <div>
                          <span style={{ color: "var(--text-dim)" }}>Summary: </span>
                          <span style={{ color: "var(--text-secondary)" }}>{rev.summary}</span>
                        </div>
                      )}
                      {rev.content && (
                        <details style={{ marginTop: 4 }}>
                          <summary
                            style={{
                              color: "var(--text-dim)",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            Full content snapshot
                          </summary>
                          <pre
                            style={{
                              marginTop: 8,
                              padding: 12,
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-md)",
                              fontSize: "0.78rem",
                              color: "var(--text-secondary)",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              maxHeight: 300,
                              overflow: "auto",
                              lineHeight: 1.5,
                            }}
                          >
                            {rev.content}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
