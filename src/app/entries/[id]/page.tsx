"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import RelatedEntries from "@/components/RelatedEntries";
import RevisionHistory from "@/components/RevisionHistory";
import StatusBadge from "@/components/StatusBadge";
import TypeBadge from "@/components/TypeBadge";
import { STATUS_OPTIONS, formatDate } from "@/lib/utils";
import { useSettings } from "@/lib/useSettings";
import {
  ArrowLeft, Edit2, Trash2, ExternalLink, Tag, Clock, Globe,
  Check, X, Loader2, Network, Star, Download
} from "lucide-react";

interface Entry {
  id: number;
  type: string;
  source: string;
  title: string;
  summary: string | null;
  content: string | null;
  status: string;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: number; name: string }[];
  images: { id: number; url: string; key: string; filename: string; mimeType: string; size: number; caption: string | null; sortOrder: number }[];
  authorId: number | null;
  author: { id: number; displayName: string; avatarUrl: string | null } | null;
  isFavorited?: boolean;
  pluginRender?: { id: string; type: string; title?: string; data?: Record<string, unknown> }[];
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; displayName: string; avatarUrl: string | null } | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--background)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: "0.875rem",
  color: "var(--text)", outline: "none", boxSizing: "border-box",
};

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: "var(--radius-md)",
  fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", border: "none",
  transition: "all 0.15s ease",
};

export default function EntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const settings = useSettings();
  const statusOpts = settings?.status_options?.map(s => s.id) ?? [...STATUS_OPTIONS];
  const statusLabels: Record<string, string> = {};
  if (settings?.status_options) { for (const s of settings.status_options) statusLabels[s.id] = s.label; }
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editTags, setEditTags] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportEntry = (format: "json" | "csv" | "markdown") => {
    if (!entry) return;
    const url = `/api/plugins/export/export/${entry.id}?format=${format}&includeComments=true`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportMenu(false);
  };

  const fetchEntry = useCallback(async () => {
    const res = await fetch(`/api/entries/${params.id}`);
    if (!res.ok) { router.push("/entries"); return; }
    const data = await res.json();
    setEntry(data);
    setLoading(false);
  }, [params.id, router]);

  useEffect(() => { fetchEntry(); }, [fetchEntry]);
  useEffect(() => {
    fetch(`/api/entries/${params.id}/comments`)
      .then((res) => res.ok ? res.json() : { comments: [] })
      .then((data) => setComments(data.comments || []));
  }, [params.id]);

  const canEdit = session?.user?.effectiveRole === "admin" || (session?.user?.effectiveRole === "editor" && session.user.id === String(entry?.authorId ?? ""));
  const canDelete = session?.user?.effectiveRole === "admin";
  const canComment = Boolean(entry && (session?.user?.effectiveRole === "admin" || (session?.user?.effectiveRole === "editor" && session.user.id !== String(entry.authorId ?? ""))));

  const startEdit = () => {
    if (!entry) return;
    setEditTitle(entry.title);
    setEditSummary(entry.summary || "");
    setEditContent(entry.content || "");
    setEditStatus(entry.status);
    setEditUrl(entry.url || "");
    setEditTags(entry.tags.map((t) => t.name).join(", "));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!entry) return;
    setSaving(true);
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle, summary: editSummary || null, content: editContent || null,
        status: editStatus, url: editUrl || null,
        tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    if (res.ok) { const updated = await res.json(); setEntry(updated); setEditing(false); }
    setSaving(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!entry) return;
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { const updated = await res.json(); setEntry(updated); }
  };

  const deleteEntry = async () => {
    if (!entry) return;
    setDeleting(true);
    await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    router.push("/entries");
  };

  const addComment = async () => {
    if (!entry || !commentText.trim()) return;
    const res = await fetch(`/api/entries/${entry.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setComments((current) => [...current, data.comment]);
    setCommentText("");
  };

  const toggleFavorite = async () => {
    if (!entry) return;
    const res = await fetch(`/api/entries/${entry.id}/favorite`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setEntry({ ...entry, isFavorited: data.favorited });
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <Loader2 style={{ width: 24, height: 24, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!entry) return null;

  return (
    <div style={{ maxWidth: "48rem" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <Link href="/entries" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to entries
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          {!editing ? (
            <>
              <Link href={`/graph?focus=${entry.id}`} style={{ ...btnBase, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", textDecoration: "none" }}>
                <Network style={{ width: 14, height: 14 }} /> Graph
              </Link>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowExportMenu((v) => !v)} style={{ ...btnBase, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <Download style={{ width: 14, height: 14 }} /> Export
                </button>
                {showExportMenu && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 50, minWidth: 140, overflow: "hidden" }}>
                    {(["json", "csv", "markdown"] as const).map((fmt) => (
                      <button key={fmt} onClick={() => exportEntry(fmt)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: "0.82rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", borderBottom: fmt !== "markdown" ? "1px solid var(--border)" : "none" }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "var(--surface-hover)"; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "none"; }}>
                        {fmt === "json" ? "JSON" : fmt === "csv" ? "CSV" : "Markdown"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {canEdit ? (
                <button onClick={startEdit} style={{ ...btnBase, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <Edit2 style={{ width: 14, height: 14 }} /> Edit
                </button>
              ) : null}
              {canDelete ? (
                <button onClick={() => setShowDeleteConfirm(true)} style={{ ...btnBase, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--danger)" }}>
                  <Trash2 style={{ width: 14, height: 14 }} /> Delete
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button onClick={() => setEditing(false)} style={{ ...btnBase, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <X style={{ width: 14, height: 14 }} /> Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} style={{ ...btnBase, background: "var(--accent)", color: "var(--accent-contrast)", opacity: saving ? 0.6 : 1 }}>
                {saving ? <Loader2 style={{ width: 14, height: 14 }} /> : <Check style={{ width: 14, height: 14 }} />} Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ marginBottom: 16, padding: 16, background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--danger)" }}>Move this entry to trash?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ ...btnBase, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Cancel</button>
            <button onClick={deleteEntry} disabled={deleting} style={{ ...btnBase, background: "var(--danger)", color: "#fff" }}>
              {deleting && <Loader2 style={{ width: 12, height: 12 }} />} Move to trash
            </button>
          </div>
        </div>
      )}

      {/* Hero card */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: 16 }}>
        {/* Badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <TypeBadge type={entry.type} />
          {editing ? (
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: "0.75rem" }}>
              {statusOpts.map((s) => <option key={s} value={s}>{statusLabels[s] || s.replace(/_/g, " ")}</option>)}
            </select>
          ) : canEdit ? (
            <div style={{ position: "relative" }}>
              <StatusBadge status={entry.status} />
              <select value={entry.status} onChange={(e) => updateStatus(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }} title="Change status">
                {statusOpts.map((s) => <option key={s} value={s}>{statusLabels[s] || s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          ) : (
            <StatusBadge status={entry.status} />
          )}
        </div>

        {/* Title */}
        {editing ? (
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ ...inputStyle, fontSize: "1.25rem", fontFamily: "var(--font-heading)", fontWeight: 400, marginBottom: 16 }} />
        ) : (
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 400, color: "var(--text)", marginBottom: 16, lineHeight: 1.3 }}>{entry.title}</h1>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 16 }}>
          {entry.author ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, overflow: "hidden", background: "var(--accent-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: "0.7rem", fontWeight: 700 }}>
                {entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : entry.author.displayName.charAt(0).toUpperCase()}
              </span>
              {entry.author.displayName}
            </span>
          ) : null}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Globe style={{ width: 14, height: 14 }} /> {entry.source}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock style={{ width: 14, height: 14 }} /> {formatDate(entry.createdAt)}
          </span>
          {entry.url && !editing && (
            <a href={entry.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", textDecoration: "none" }}>
              <ExternalLink style={{ width: 14, height: 14 }} /> Source
            </a>
          )}
          <button onClick={toggleFavorite} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0, color: entry.isFavorited ? "var(--accent)" : "var(--text-dim)", transition: "color 0.15s ease" }} title={entry.isFavorited ? "Remove from favorites" : "Add to favorites"}>
            <Star style={{ width: 14, height: 14, fill: entry.isFavorited ? "var(--accent)" : "none" }} /> {entry.isFavorited ? "Favorited" : "Favorite"}
          </button>
        </div>

        {editing && (
          <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL (optional)" style={{ ...inputStyle, marginBottom: 12 }} />
        )}

        {/* Tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag style={{ width: 14, height: 14, color: "var(--text-dim)", flexShrink: 0 }} />
          {editing ? (
            <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="tag1, tag2, tag3" style={{ ...inputStyle, fontSize: "0.8rem", padding: "6px 10px" }} />
          ) : entry.tags.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {entry.tags.map((tag) => (
                <span key={tag.id} style={{ fontSize: "0.75rem", background: "var(--surface-hover)", color: "var(--text-secondary)", padding: "3px 10px", borderRadius: 999 }}>
                  {tag.name}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>No tags</span>
          )}
        </div>
      </div>

      {/* Images */}
      {entry.images && entry.images.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: 16 }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Images ({entry.images.length})
          </h2>
          <div className="entry-image-grid">
            {entry.images.map((img) => (
              <div key={img.id} style={{ position: "relative" }}>
                <a href={img.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={img.url}
                    alt={img.caption || img.filename}
                    style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "var(--radius-md)", display: "block", border: "1px solid var(--border)" }}
                  />
                </a>
                {img.caption && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>{img.caption}</p>
                )}
              </div>
            ))}
          </div>
          <style>{`
            .entry-image-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            @media (min-width: 640px) {
              .entry-image-grid {
                grid-template-columns: repeat(3, 1fr);
              }
            }
          `}</style>
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: 16 }}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Comments
        </h2>

        {canComment ? (
          <div style={{ marginBottom: 16 }}>
            <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment" style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} />
            <div style={{ marginTop: 10 }}>
              <button onClick={addComment} style={{ ...btnBase, background: "var(--accent)", color: "var(--accent-contrast)" }}>
                Add comment
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 12 }}>
          {comments.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No comments yet.</p>
          ) : comments.map((comment) => (
            <div key={comment.id} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, overflow: "hidden", background: "var(--accent-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: "0.65rem", fontWeight: 700 }}>
                  {comment.author?.avatarUrl ? <img src={comment.author.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : comment.author?.displayName?.charAt(0).toUpperCase() || "?"}
                </span>
                <span style={{ fontSize: "0.82rem", color: "var(--text)" }}>{comment.author?.displayName || "Unknown"}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{formatDate(comment.createdAt)}</span>
              </div>
              <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{comment.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {(entry.summary || editing) && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: 16 }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Summary</h2>
          {editing ? (
            <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} placeholder="Short summary..."
              style={{ ...inputStyle, resize: "vertical" }} />
          ) : (
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{entry.summary}</p>
          )}
        </div>
      )}

      {/* Content */}
      {(entry.content || editing) && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px 24px" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Content</h2>
          {editing ? (
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={20} placeholder="Full content (markdown)..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.8rem", minHeight: 300 }} />
          ) : (
            <div className="prose-kb">
              <MarkdownRenderer content={entry.content || ""} />
            </div>
          )}
        </div>
      )}

      {!editing && <RevisionHistory entryId={entry.id} currentTitle={entry.title} />}

      {!editing && entry.pluginRender?.map((block) => {
        if (block.type === "related-entries") {
          return <RelatedEntries key={block.id} entryId={Number(block.data?.entryId || entry.id)} />;
        }
        return null;
      })}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select { color-scheme: dark; }
        input:focus, textarea:focus, select:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 2px rgba(201,169,110,0.15);
        }
      `}</style>
    </div>
  );
}
