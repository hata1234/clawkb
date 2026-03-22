"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { History, ChevronDown, ChevronUp, GitCompareArrows } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { diffLines, diffWords } from "diff";

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

interface CurrentEntry {
  title: string;
  summary: string | null;
  content: string | null;
  status: string;
  type: string;
  source: string;
  tags: { id: number; name: string }[] | string[];
  author?: { id: number; displayName: string; avatarUrl: string | null } | null;
}

interface RevisionHistoryProps {
  entryId: number;
  currentTitle: string;
  currentEntry?: CurrentEntry;
}

/* ═══ Inline Diff Renderer ═══ */

function DiffBlock({ label, oldText, newText, mode }: { label: string; oldText: string; newText: string; mode: "line" | "word" }) {
  if (oldText === newText) return null;

  const parts = mode === "line"
    ? diffLines(oldText, newText)
    : diffWords(oldText, newText);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        padding: 12,
        background: "var(--background)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        fontSize: "0.82rem",
        lineHeight: 1.6,
        whiteSpace: mode === "line" ? "pre-wrap" : "pre-wrap",
        wordBreak: "break-word",
        fontFamily: mode === "line" ? "var(--font-mono)" : "inherit",
        maxHeight: 400,
        overflow: "auto",
      }}>
        {parts.map((part, i) => {
          if (part.added) {
            return <span key={i} style={{ background: "rgba(74,222,128,0.15)", color: "var(--success, #4ade80)", textDecoration: "none" }}>{part.value}</span>;
          }
          if (part.removed) {
            return <span key={i} style={{ background: "rgba(248,113,113,0.15)", color: "var(--danger, #f87171)", textDecoration: "line-through" }}>{part.value}</span>;
          }
          return <span key={i} style={{ color: "var(--text-secondary)" }}>{part.value}</span>;
        })}
      </div>
    </div>
  );
}

function TagsDiff({ oldTags, newTags }: { oldTags: string[]; newTags: string[] }) {
  const added = newTags.filter(t => !oldTags.includes(t));
  const removed = oldTags.filter(t => !newTags.includes(t));
  const unchanged = newTags.filter(t => oldTags.includes(t));

  if (added.length === 0 && removed.length === 0) return null;

  const tagStyle = (color: string, bg: string, strike?: boolean): React.CSSProperties => ({
    display: "inline-block",
    fontSize: "0.75rem",
    padding: "2px 8px",
    borderRadius: 999,
    background: bg,
    color,
    marginRight: 4,
    marginBottom: 4,
    textDecoration: strike ? "line-through" : "none",
  });

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Tags
      </div>
      <div>
        {removed.map(t => <span key={`r-${t}`} style={tagStyle("var(--danger)", "rgba(248,113,113,0.12)", true)}>{t}</span>)}
        {unchanged.map(t => <span key={`u-${t}`} style={tagStyle("var(--text-secondary)", "var(--surface-hover)")}>{t}</span>)}
        {added.map(t => <span key={`a-${t}`} style={tagStyle("var(--success, #4ade80)", "rgba(74,222,128,0.12)")}>{t}</span>)}
      </div>
    </div>
  );
}

function FieldDiff({ label, oldVal, newVal }: { label: string; oldVal: string; newVal: string }) {
  if (oldVal === newVal) return null;
  return (
    <div style={{ marginBottom: 8, fontSize: "0.82rem" }}>
      <span style={{ color: "var(--text-dim)" }}>{label}: </span>
      <span style={{ background: "rgba(248,113,113,0.12)", color: "var(--danger)", textDecoration: "line-through", padding: "1px 4px", borderRadius: 3 }}>{oldVal}</span>
      <span style={{ color: "var(--text-dim)", margin: "0 6px" }}>→</span>
      <span style={{ background: "rgba(74,222,128,0.12)", color: "var(--success, #4ade80)", padding: "1px 4px", borderRadius: 3 }}>{newVal}</span>
    </div>
  );
}

/* ═══ Diff View ═══ */

function RevisionDiff({ older, newer }: { older: Revision; newer: Revision }) {
  const t = useTranslations('RevisionHistory');
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      <FieldDiff label="Title" oldVal={older.title} newVal={newer.title} />
      <FieldDiff label="Status" oldVal={older.status} newVal={newer.status} />
      <FieldDiff label="Type" oldVal={older.type} newVal={newer.type} />
      <FieldDiff label="Source" oldVal={older.source} newVal={newer.source} />
      <TagsDiff oldTags={older.tags} newTags={newer.tags} />
      <DiffBlock label="Summary" oldText={older.summary || ""} newText={newer.summary || ""} mode="word" />
      <DiffBlock label="Content" oldText={older.content || ""} newText={newer.content || ""} mode="line" />
      {older.title === newer.title && older.status === newer.status && older.type === newer.type && older.source === newer.source
        && (older.summary || "") === (newer.summary || "") && (older.content || "") === (newer.content || "")
        && JSON.stringify(older.tags) === JSON.stringify(newer.tags) && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontStyle: "italic" }}>{t('noDifferences')}</p>
      )}
    </div>
  );
}

/* ═══ Main Component ═══ */

const CURRENT_ID = -1; // sentinel for "Current (live)" pseudo-revision

export default function RevisionHistory({ entryId, currentTitle, currentEntry }: RevisionHistoryProps) {
  const t = useTranslations('RevisionHistory');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [expandedRevision, setExpandedRevision] = useState<number | null>(null);
  const [diffMode, setDiffMode] = useState(false);
  const [diffA, setDiffA] = useState<number | null>(null); // older (left)
  const [diffB, setDiffB] = useState<number | null>(null); // newer (right)

  useEffect(() => {
    fetch(`/api/entries/${entryId}/revisions`)
      .then((res) => (res.ok ? res.json() : { revisions: [] }))
      .then((data) => setRevisions(data.revisions || []));
  }, [entryId]);

  // Build a pseudo-revision from the current live entry
  const currentRevision: Revision | null = useMemo(() => {
    if (!currentEntry) return null;
    const tags = currentEntry.tags.map(t => typeof t === "string" ? t : t.name);
    return {
      id: CURRENT_ID,
      title: currentEntry.title,
      summary: currentEntry.summary,
      content: currentEntry.content,
      status: currentEntry.status,
      type: currentEntry.type,
      source: currentEntry.source,
      tags,
      editNote: null,
      createdAt: new Date().toISOString(),
      author: currentEntry.author ? { id: currentEntry.author.id, displayName: currentEntry.author.displayName, avatarUrl: currentEntry.author.avatarUrl } : null,
    };
  }, [currentEntry]);

  // All options for diff selectors: current + revisions
  const allOptions = useMemo(() => {
    const list: Revision[] = [];
    if (currentRevision) list.push(currentRevision);
    list.push(...revisions);
    return list;
  }, [currentRevision, revisions]);

  const findRev = (id: number | null) => {
    if (id === null) return null;
    if (id === CURRENT_ID) return currentRevision;
    return revisions.find(r => r.id === id) || null;
  };

  const revA = useMemo(() => findRev(diffA), [revisions, currentRevision, diffA]);
  const revB = useMemo(() => findRev(diffB), [revisions, currentRevision, diffB]);

  if (revisions.length === 0) return null;

  const toggleDiffMode = () => {
    if (!diffMode) {
      if (currentRevision && revisions.length >= 1) {
        // Default: compare latest revision → current live
        setDiffA(revisions[0].id);
        setDiffB(CURRENT_ID);
      } else if (revisions.length >= 2) {
        setDiffA(revisions[1].id);
        setDiffB(revisions[0].id);
      }
    }
    setDiffMode(!diffMode);
    setExpandedRevision(null);
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-xl)",
      padding: "20px 24px",
      marginTop: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            flex: 1, background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          <History style={{ width: 14, height: 14, color: "var(--text-dim)" }} />
          <h2 style={{
            fontSize: "0.72rem", fontWeight: 600, color: "var(--text-dim)",
            textTransform: "uppercase", letterSpacing: "0.08em", margin: 0,
          }}>
            {t('title', { count: revisions.length })}
          </h2>
          {expanded
            ? <ChevronUp style={{ width: 14, height: 14, color: "var(--text-dim)", marginLeft: "auto" }} />
            : <ChevronDown style={{ width: 14, height: 14, color: "var(--text-dim)", marginLeft: "auto" }} />
          }
        </button>
        {expanded && revisions.length >= 2 && (
          <button
            onClick={toggleDiffMode}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: "var(--radius-md)",
              border: diffMode ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: diffMode ? "var(--accent-muted)" : "transparent",
              color: diffMode ? "var(--accent)" : "var(--text-dim)",
              fontSize: "0.72rem", fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <GitCompareArrows style={{ width: 12, height: 12 }} />
            {t('diff')}
          </button>
        )}
      </div>

      {/* Diff Mode */}
      {expanded && diffMode && (
        <div style={{ marginTop: 16 }}>
          {/* Selectors */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>{t('from')}</span>
              <select
                value={diffA ?? ""}
                onChange={e => setDiffA(parseInt(e.target.value))}
                style={{
                  background: "var(--background)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: "6px 10px",
                  fontSize: "0.8rem", color: "var(--text)", outline: "none",
                }}
              >
                {currentRevision && (
                  <option value={CURRENT_ID}>{t('currentLive')}</option>
                )}
                {revisions.map((rev, idx) => (
                  <option key={rev.id} value={rev.id}>
                    v{revisions.length - idx} — {rev.author?.displayName || "?"} — {formatDate(rev.createdAt)}
                  </option>
                ))}
              </select>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>→</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>{t('to')}</span>
              <select
                value={diffB ?? ""}
                onChange={e => setDiffB(parseInt(e.target.value))}
                style={{
                  background: "var(--background)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: "6px 10px",
                  fontSize: "0.8rem", color: "var(--text)", outline: "none",
                }}
              >
                {currentRevision && (
                  <option value={CURRENT_ID}>{t('currentLive')}</option>
                )}
                {revisions.map((rev, idx) => (
                  <option key={rev.id} value={rev.id}>
                    v{revisions.length - idx} — {rev.author?.displayName || "?"} — {formatDate(rev.createdAt)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff output */}
          {revA && revB && revA.id !== revB.id ? (
            <RevisionDiff older={revA} newer={revB} />
          ) : revA && revB && revA.id === revB.id ? (
            <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontStyle: "italic" }}>{t('selectDifferent')}</p>
          ) : null}
        </div>
      )}

      {/* List Mode */}
      {expanded && !diffMode && (
        <div style={{ display: "grid", gap: 10, marginTop: 16, overflow: "hidden" }}>
          {revisions.map((rev, idx) => {
            const isExpanded = expandedRevision === rev.id;
            const titleChanged = rev.title !== currentTitle;
            return (
              <div key={rev.id} style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                overflow: "hidden",
              }}>
                <button
                  onClick={() => setExpandedRevision(isExpanded ? null : rev.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, gap: 12,
                    minWidth: 0, overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, overflow: "hidden" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      v{revisions.length - idx}
                    </span>
                    <span style={{
                      width: 18, height: 18, borderRadius: 999, overflow: "hidden",
                      background: "var(--accent-muted)", display: "inline-flex", alignItems: "center",
                      justifyContent: "center", color: "var(--accent)", fontSize: "0.55rem", fontWeight: 700, flexShrink: 0,
                    }}>
                      {rev.author?.avatarUrl
                        ? <img src={rev.author.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : rev.author?.displayName?.charAt(0).toUpperCase() || "?"
                      }
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {rev.author?.displayName || "Unknown"}
                    </span>
                    {rev.editNote && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
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
                    {/* Latest revision: diff against current live entry */}
                    {idx === 0 && currentRevision ? (
                      <>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>
                          {t('changesSince')}
                        </div>
                        <RevisionDiff older={rev} newer={currentRevision} />
                      </>
                    ) : idx < revisions.length - 1 ? (
                      <RevisionDiff older={revisions[idx + 1]} newer={rev} />
                    ) : (
                      <div style={{ display: "grid", gap: 8, fontSize: "0.82rem" }}>
                        <div>
                          <span style={{ color: "var(--text-dim)" }}>Title: </span>
                          <span style={{ color: titleChanged ? "var(--accent)" : "var(--text-secondary)" }}>{rev.title}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-dim)" }}>Status: </span>
                          <span style={{ color: "var(--text-secondary)" }}>{rev.status}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-dim)" }}>Tags: </span>
                          <span style={{ color: "var(--text-secondary)" }}>{rev.tags.length > 0 ? rev.tags.join(", ") : "—"}</span>
                        </div>
                        {rev.summary && (
                          <div>
                            <span style={{ color: "var(--text-dim)" }}>Summary: </span>
                            <span style={{ color: "var(--text-secondary)" }}>{rev.summary}</span>
                          </div>
                        )}
                        {rev.content && (
                          <details style={{ marginTop: 4 }}>
                            <summary style={{ color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer", userSelect: "none" }}>
                              {t('fullContentSnapshot')}
                            </summary>
                            <pre style={{
                              marginTop: 8, padding: 12,
                              background: "var(--surface)", border: "1px solid var(--border)",
                              borderRadius: "var(--radius-md)", fontSize: "0.78rem",
                              color: "var(--text-secondary)", whiteSpace: "pre-wrap",
                              wordBreak: "break-word", maxHeight: 300, overflow: "auto", lineHeight: 1.5,
                            }}>
                              {rev.content}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
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
