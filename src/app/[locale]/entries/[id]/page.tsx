"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  icon12,
  icon14,
  icon14Dim,
  flexCenterGap8,
  flexWrapGap6,
  flexGap8,
  posRelative,
  caption,
  coverImage,
} from "@/styles/common";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MentionTextarea from "@/components/MentionTextarea";
import RelatedEntries from "@/components/RelatedEntries";
import RevisionHistory from "@/components/RevisionHistory";
import StatusBadge from "@/components/StatusBadge";
import dynamic from "next/dynamic";
const BpmnEditor = dynamic(() => import("@/components/BpmnEditor"), { ssr: false });

import { STATUS_OPTIONS, formatDate } from "@/lib/utils";
import { useSettings } from "@/lib/useSettings";
import ShareDialog from "@/components/ShareDialog";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  Tag,
  Clock,
  Globe,
  Check,
  X,
  Loader2,
  Network,
  Star,
  Download,
  FolderOpen,
  Share2,
} from "lucide-react";

interface Entry {
  id: number;
  docNumber?: string | null;
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
  collections?: { id: number; name: string; icon?: string | null; color?: string | null }[];
  images: {
    id: number;
    url: string;
    key: string;
    filename: string;
    mimeType: string;
    size: number;
    caption: string | null;
    sortOrder: number;
  }[];
  authorId: number | null;
  author: { id: number; displayName: string; avatarUrl: string | null } | null;
  bpmnXml?: string | null;
  isFavorited?: boolean;
  pluginRender?: { id: string; type: string; title?: string; data?: Record<string, unknown> }[];
  resolvedTags?: {
    placeholder: string;
    tag: string;
    value: string;
    component: string;
    props: Record<string, unknown>;
  }[];
}

interface EntryFlow {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; displayName: string; avatarUrl: string | null } | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
};

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: "var(--radius-md)",
  fontSize: "0.8rem",
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
  transition: "all 0.15s ease",
};

export default function EntryDetailPage() {
  const t = useTranslations("EntryDetail");
  const tc = useTranslations("Common");
  const tb = useTranslations("Bpmn");
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const settings = useSettings();
  const statusOpts = settings?.status_options?.map((s) => s.id) ?? [...STATUS_OPTIONS];
  const statusLabels: Record<string, string> = {};
  if (settings?.status_options) {
    for (const s of settings.status_options) statusLabels[s.id] = s.label;
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPdfPasswordDialog, setShowPdfPasswordDialog] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfExporting, setPdfExporting] = useState(false);
  const [flows, setFlows] = useState<EntryFlow[]>([]);
  const [newFlowName, setNewFlowName] = useState("");
  const [editCollectionIds, setEditCollectionIds] = useState<number[]>([]);
  const [allCollections, setAllCollections] = useState<{ id: number; name: string; icon?: string | null }[]>([]);

  // Plugin entry panels
  const [pluginPanels, setPluginPanels] = useState<{ id: string; title: string; component: string; order?: number; enableButton?: { label: string; action: string } }[]>([]);
  const [pluginPanelData, setPluginPanelData] = useState<Record<string, Record<string, unknown> | null>>({});
  const [pluginPanelsLoaded, setPluginPanelsLoaded] = useState(false);

  const fetchPluginPanels = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins/entry-panels");
      if (res.ok) {
        const data = await res.json();
        setPluginPanels(data.panels || []);
      }
    } catch {
      // Plugin system may not be available
    } finally {
      setPluginPanelsLoaded(true);
    }
  }, []);

  const fetchPanelData = useCallback(async (panel: { enableButton?: { label: string; action: string } }, eid: number) => {
    if (!panel.enableButton) return;
    try {
      const res = await fetch(`${panel.enableButton.action}/${eid}`);
      if (res.ok) {
        const data = await res.json();
        setPluginPanelData(prev => ({ ...prev, [panel.enableButton!.action]: data.lifecycle || data.data || data }));
      }
    } catch {
      // silent
    }
  }, []);

  const enablePluginPanel = async (panel: { enableButton?: { label: string; action: string } }) => {
    if (!entry || !panel.enableButton) return;
    try {
      const res = await fetch(panel.enableButton.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      });
      if (res.ok) {
        fetchPanelData(panel, entry.id);
        fetchEntry();
      }
    } catch {
      // silent
    }
  };

  const exportEntry = (format: "json" | "csv" | "markdown" | "pdf") => {
    if (!entry) return;
    if (format === "pdf") {
      setShowExportMenu(false);
      setShowPdfPasswordDialog(true);
      return;
    }
    const url = `/api/plugins/export/export/${entry.id}?format=${format}&includeComments=true`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportMenu(false);
  };

  const exportPdf = async () => {
    if (!entry) return;
    setPdfExporting(true);
    try {
      const urlParams = new URLSearchParams({ format: "pdf", includeComments: "true" });
      if (pdfPassword.trim()) urlParams.set("password", pdfPassword.trim());
      const res = await fetch(`/api/plugins/export/export/${entry.id}?${urlParams}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entry-${entry.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setPdfExporting(false);
      setShowPdfPasswordDialog(false);
      setPdfPassword("");
    }
  };

  const fetchEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries/${params.id}`);
      if (res.status === 401) {
        setError({ status: 401, message: t("needLogin") });
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setError({ status: 403, message: t("noPermission") });
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setError({ status: 404, message: t("doesNotExist") });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError({ status: res.status, message: t("somethingWrong") });
        setLoading(false);
        return;
      }
      const data = await res.json();
      setEntry(data);
      setLoading(false);
    } catch (err) {
      setError({ status: 0, message: t("failedToConnect") });
      setLoading(false);
    }
  }, [params.id, t]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);
  useEffect(() => {
    fetchPluginPanels();
  }, [fetchPluginPanels]);
  useEffect(() => {
    if (params.id && pluginPanels.length > 0) {
      for (const panel of pluginPanels) {
        fetchPanelData(panel, Number(params.id));
      }
    }
  }, [params.id, pluginPanels, fetchPanelData]);
  useEffect(() => {
    fetch(`/api/entries/${params.id}/comments`)
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => setComments(data.comments || []));
    fetch(`/api/entries/${params.id}/flows`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFlows(data));
  }, [params.id]);

  // Client-side hinting only — server enforces actual ACL via canEditEntry()
  const canEdit = Boolean(session?.user?.isAdmin || (session?.user?.id && String(entry?.authorId) === session.user.id));
  const canDelete = session?.user?.isAdmin || false;
  const canComment = Boolean(entry && session?.user?.id);

  const startEdit = () => {
    if (!entry) return;
    setEditTitle(entry.title);
    setEditSummary(entry.summary || "");
    setEditContent(entry.content || "");
    setEditStatus(entry.status);
    setEditUrl(entry.url || "");
    setEditTags(entry.tags.map((tg) => tg.name).join(", "));
    setEditCollectionIds(entry.collections?.map((c) => c.id) || []);
    // Fetch all collections for the selector
    fetch("/api/collections")
      .then((r) => r.json())
      .then((d) => setAllCollections(d.flat || []))
      .catch(() => {});
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!entry) return;
    setSaving(true);
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        summary: editSummary || null,
        content: editContent || null,
        status: editStatus,
        url: editUrl || null,
        tags: editTags
          .split(",")
          .map((tg) => tg.trim())
          .filter(Boolean),
        collectionIds: editCollectionIds,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntry(updated);
      setEditing(false);
    }
    setSaving(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!entry) return;
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntry(updated);
    }
  };

  const deleteEntry = async () => {
    if (!entry) return;
    setDeleting(true);
    await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    router.push("/entries");
  };

  const createFlow = async () => {
    if (!entry) return;
    const res = await fetch(`/api/entries/${entry.id}/flows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFlowName.trim() || "Flow " + (flows.length + 1) }),
    });
    if (res.ok) {
      const flow = await res.json();
      setFlows([...flows, flow]);
      setNewFlowName("");
      // Insert tag into content at cursor or end
      const tag = `{{flow:${flow.id}}}`;
      setEditContent((prev) => (prev ? prev + "\n\n" + tag : tag));
    }
  };

  const deleteFlow = async (flowId: number) => {
    if (!entry) return;
    const res = await fetch(`/api/entries/${entry.id}/flows/${flowId}`, { method: "DELETE" });
    if (res.ok) {
      setFlows(flows.filter((f) => f.id !== flowId));
      // Remove tag from content
      setEditContent((prev) => prev.replace(new RegExp(`\\{\\{flow:${flowId}\\}\\}\\n?`, "g"), ""));
    }
  };

  const insertFlowTag = (flowId: number) => {
    const tag = `{{flow:${flowId}}}`;
    setEditContent((prev) => (prev ? prev + "\n\n" + tag : tag));
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

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
      </div>
    );

  if (error)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>
          {error.status === 401
            ? "\uD83D\uDD12"
            : error.status === 403
              ? "\uD83D\uDEAB"
              : error.status === 404
                ? "\uD83D\uDCED"
                : "\u26A0\uFE0F"}
        </div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", color: "var(--text)", marginBottom: 8 }}>
          {error.status === 401
            ? t("loginRequired")
            : error.status === 403
              ? t("accessDenied")
              : error.status === 404
                ? t("notFound")
                : t("error")}
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 24, maxWidth: 400 }}>
          {error.message}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          {error.status === 401 ? (
            <Link
              href={`/login?callbackUrl=/entries/${params.id}`}
              style={{
                ...btnBase,
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                textDecoration: "none",
              }}
            >
              {t("logIn")}
            </Link>
          ) : null}
          <Link
            href="/entries"
            style={{
              ...btnBase,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft style={icon14} /> {t("backToEntries")}
          </Link>
        </div>
      </div>
    );

  if (!entry) return null;

  return (
    <div style={{ maxWidth: "48rem" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Link
          href="/entries"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> {t("backToEntries")}
        </Link>
        <div style={flexGap8}>
          {!editing ? (
            <>
              <Link
                href={`/graph?focus=${entry.id}`}
                style={{
                  ...btnBase,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <Network style={icon14} /> {t("graph")}
              </Link>
              <div style={posRelative}>
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  style={{
                    ...btnBase,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Download style={icon14} /> {t("export")}
                </button>
                {showExportMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 4,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      zIndex: 50,
                      minWidth: 140,
                      overflow: "hidden",
                    }}
                  >
                    {(["json", "csv", "markdown", "pdf"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => exportEntry(fmt)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 14px",
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          borderBottom: fmt !== "pdf" ? "1px solid var(--border)" : "none",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.background = "var(--surface-hover)";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.background = "none";
                        }}
                      >
                        {fmt === "json"
                          ? t("json")
                          : fmt === "csv"
                            ? t("csv")
                            : fmt === "markdown"
                              ? t("markdown")
                              : t("pdf")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowShareDialog(true)}
                style={{
                  ...btnBase,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <Share2 style={icon14} /> {t("share")}
              </button>
              {canEdit ? (
                <button
                  onClick={startEdit}
                  style={{
                    ...btnBase,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Edit2 style={icon14} /> {t("edit")}
                </button>
              ) : null}
              {canDelete ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    ...btnBase,
                    background: "rgba(248,113,113,0.06)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    color: "var(--danger)",
                  }}
                >
                  <Trash2 style={icon14} /> {t("delete")}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                style={{
                  ...btnBase,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <X style={icon14} /> {tc("cancel")}
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  ...btnBase,
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? <Loader2 style={icon14} /> : <Check style={icon14} />} {tc("save")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            background: "rgba(248,113,113,0.05)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--danger)" }}>{t("moveToTrashConfirm")}</p>
          <div style={flexGap8}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                ...btnBase,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {tc("cancel")}
            </button>
            <button
              onClick={deleteEntry}
              disabled={deleting}
              style={{ ...btnBase, background: "var(--danger)", color: "var(--accent-contrast)" }}
            >
              {deleting && <Loader2 style={icon12} />} {t("moveToTrash")}
            </button>
          </div>
        </div>
      )}

      {/* Hero card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "24px",
          marginBottom: 16,
        }}
      >
        {/* Badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {editing ? (
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: "0.75rem" }}
            >
              {statusOpts.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s] || s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : canEdit ? (
            <div style={posRelative}>
              <StatusBadge status={entry.status} />
              <select
                value={entry.status}
                onChange={(e) => updateStatus(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
                title="Change status"
              >
                {statusOpts.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s] || s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <StatusBadge status={entry.status} />
          )}
        </div>

        {/* Doc Number + Title */}
        {!editing && entry.docNumber && (
          <span
            style={{
              display: "inline-block",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--accent)",
              background: "var(--accent-muted)",
              padding: "2px 10px",
              borderRadius: 999,
              marginBottom: 8,
              letterSpacing: "0.04em",
              fontFamily: "var(--font-mono)",
            }}
          >
            {entry.docNumber}
          </span>
        )}
        {editing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: "1.25rem",
              fontFamily: "var(--font-heading)",
              fontWeight: 400,
              marginBottom: 16,
            }}
          />
        ) : (
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--text)",
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            {entry.title}
          </h1>
        )}

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          {entry.author ? (
            <span style={flexCenterGap8}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "var(--accent-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {entry.author.avatarUrl ? (
                  <img src={entry.author.avatarUrl} alt="" style={coverImage} />
                ) : (
                  entry.author.displayName.charAt(0).toUpperCase()
                )}
              </span>
              {entry.author.displayName}
            </span>
          ) : null}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Globe style={icon14} /> {entry.source}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock style={icon14} /> {formatDate(entry.createdAt)}
          </span>
          {entry.url && !editing && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", textDecoration: "none" }}
            >
              <ExternalLink style={icon14} /> {t("source")}
            </a>
          )}
          <button
            onClick={toggleFavorite}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              color: entry.isFavorited ? "var(--accent)" : "var(--text-dim)",
              transition: "color 0.15s ease",
            }}
            title={entry.isFavorited ? t("removeFromFavorites") : t("addToFavorites")}
          >
            <Star style={{ width: 14, height: 14, fill: entry.isFavorited ? "var(--accent)" : "none" }} />{" "}
            {entry.isFavorited ? t("favorited") : t("favorite")}
          </button>
        </div>

        {editing && (
          <input
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder={t("urlPlaceholder")}
            style={{ ...inputStyle, marginBottom: 12 }}
          />
        )}

        {/* Tags */}
        <div style={flexCenterGap8}>
          <Tag style={icon14Dim} />
          {editing ? (
            <input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder={t("tagsPlaceholder")}
              style={{ ...inputStyle, fontSize: "0.8rem", padding: "6px 10px" }}
            />
          ) : entry.tags.length > 0 ? (
            <div style={flexWrapGap6}>
              {entry.tags.map((tg) => (
                <span
                  key={tg.id}
                  style={{
                    fontSize: "0.75rem",
                    background: "var(--surface-hover)",
                    color: "var(--text-secondary)",
                    padding: "3px 10px",
                    borderRadius: 999,
                  }}
                >
                  {tg.name}
                </span>
              ))}
            </div>
          ) : (
            <span style={caption}>{t("noTags")}</span>
          )}
        </div>

        {/* Collections */}
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <FolderOpen style={icon14Dim} />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                flex: 1,
                minHeight: 32,
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "4px 8px",
                alignItems: "center",
              }}
            >
              {editCollectionIds.map((cid) => {
                const col = allCollections.find((c) => c.id === cid);
                return col ? (
                  <span
                    key={cid}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.75rem",
                      background: "var(--surface-hover)",
                      color: "var(--text-secondary)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {col.icon || "📁"} {col.name}
                    <button
                      type="button"
                      onClick={() => setEditCollectionIds((prev) => prev.filter((id) => id !== cid))}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        color: "var(--text-dim)",
                      }}
                    >
                      &times;
                    </button>
                  </span>
                ) : null;
              })}
              <select
                value=""
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  if (id && !editCollectionIds.includes(id)) setEditCollectionIds((prev) => [...prev, id]);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "0.75rem",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  outline: "none",
                  padding: "2px 4px",
                }}
              >
                <option value="">{t("addCollection")}</option>
                {allCollections
                  .filter((c) => !editCollectionIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || "📁"} {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ) : entry.collections && entry.collections.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <FolderOpen style={icon14Dim} />
            <div style={flexWrapGap6}>
              {entry.collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/entries?collectionId=${col.id}`}
                  style={{
                    fontSize: "0.75rem",
                    border: "1px solid var(--border)",
                    color: col.color || "var(--text-secondary)",
                    padding: "3px 10px",
                    borderRadius: 999,
                    textDecoration: "none",
                    borderColor: col.color || "var(--border)",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = "transparent";
                  }}
                >
                  {col.icon || "\uD83D\uDCC1"} {col.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Plugin Entry Panels */}
      {pluginPanelsLoaded && pluginPanels.map((panel) => {
        const panelData = panel.enableButton ? pluginPanelData[panel.enableButton.action] : null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const DynamicPanel = dynamic(() => import(`@/components/${panel.component}`), { ssr: false }) as React.ComponentType<any>;

        if (panelData) {
          return (
            <DynamicPanel
              key={panel.id}
              entryId={entry.id}
              entryStatus={entry.status}
              lifecycle={panelData}
              entry={entry}
              canEdit={canEdit}
              onUpdate={() => {
                if (panel.enableButton) fetchPanelData(panel, entry.id);
                fetchEntry();
              }}
            />
          );
        }

        // Show enable button if panel has enableButton config and no data exists
        if (panel.enableButton && canEdit) {
          return (
            <div key={panel.id} style={{ marginBottom: 16, textAlign: "center" }}>
              <button
                onClick={() => enablePluginPanel(panel)}
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-dim)",
                  background: "none",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-xl, 16px)",
                  padding: "10px 20px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = "var(--accent)";
                  (e.target as HTMLElement).style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = "var(--border)";
                  (e.target as HTMLElement).style.color = "var(--text-dim)";
                }}
              >
                {panel.enableButton.label}
              </button>
            </div>
          );
        }

        return null;
      })}

      {/* Images */}
      {entry.images && entry.images.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            {t("images", { count: entry.images.length })}
          </h2>
          <div className="entry-image-grid">
            {entry.images.map((img) => (
              <div key={img.id} style={posRelative}>
                <a href={img.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={img.url}
                    alt={img.caption || img.filename}
                    style={{
                      width: "100%",
                      height: 200,
                      objectFit: "cover",
                      borderRadius: "var(--radius-md)",
                      display: "block",
                      border: "1px solid var(--border)",
                    }}
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

      {/* Flow Attachments — edit mode: manage & insert; view mode handled by {{flow:ID}} in content */}
      {editing && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            <Network style={{ width: 13, height: 13, display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
            {tb("title")}
          </h2>

          {/* Existing flows */}
          {flows.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <Network style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--text)" }}>
                    {flow.name || `Flow ${flow.id}`}
                  </span>
                  <code
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-dim)",
                      background: "var(--surface-hover)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {"{{flow:" + flow.id + "}}"}
                  </code>
                  <button
                    onClick={() => insertFlowTag(flow.id)}
                    title="Insert tag"
                    style={{
                      ...btnBase,
                      padding: "4px 8px",
                      fontSize: "0.72rem",
                      background: "var(--accent-muted)",
                      color: "var(--accent)",
                    }}
                  >
                    Insert
                  </button>
                  <Link
                    href={`/bpmn/${entry.id}?flowId=${flow.id}`}
                    style={{
                      ...btnBase,
                      padding: "4px 8px",
                      fontSize: "0.72rem",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                    }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteFlow(flow.id)}
                    title="Delete"
                    style={{
                      ...btnBase,
                      padding: "4px 8px",
                      fontSize: "0.72rem",
                      background: "transparent",
                      color: "var(--danger, #e53e3e)",
                    }}
                  >
                    <X style={icon12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new flow */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="Flow name (optional)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={createFlow}
              style={{ ...btnBase, background: "var(--accent)", color: "var(--accent-contrast)", whiteSpace: "nowrap" }}
            >
              + {tb("addFlow")}
            </button>
          </div>

          {/* Legacy bpmnXml migration hint */}
          {entry.bpmnXml && flows.length === 0 && (
            <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 10, fontStyle: "italic" }}>
              This entry has a legacy flow diagram. Create a new flow to migrate it.
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      {(entry.summary || editing) && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            {t("summary")}
          </h2>
          {editing ? (
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              rows={3}
              placeholder={t("summaryPlaceholder")}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          ) : (
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{entry.summary}</p>
          )}
        </div>
      )}

      {/* Content */}
      {(entry.content || editing) && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            {t("content")}
          </h2>
          {editing ? (
            <MentionTextarea
              name="editContent"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={20}
              placeholder={t("contentPlaceholder")}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                minHeight: 300,
              }}
            />
          ) : (
            <div className="prose-kb">
              <MarkdownRenderer content={entry.content || ""} resolvedTags={entry.resolvedTags} />
            </div>
          )}
        </div>
      )}

      {/* Revision History */}
      {!editing && (
        <RevisionHistory
          entryId={entry.id}
          currentTitle={entry.title}
          currentEntry={{
            title: entry.title,
            summary: entry.summary,
            content: entry.content,
            status: entry.status,
            type: entry.type,
            source: entry.source,
            tags: entry.tags,
            author: entry.author,
          }}
        />
      )}

      {/* Comments — after revision history */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "20px 24px",
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--text-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          {t("comments")}
        </h2>

        {canComment ? (
          <div style={{ marginBottom: 16 }}>
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={t("addComment")}
              style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            />
            <div style={{ marginTop: 10 }}>
              <button
                onClick={addComment}
                style={{ ...btnBase, background: "var(--accent)", color: "var(--accent-contrast)" }}
              >
                {t("addCommentBtn")}
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 12 }}>
          {comments.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{t("noComments")}</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      overflow: "hidden",
                      background: "var(--accent-muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent)",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                    }}
                  >
                    {comment.author?.avatarUrl ? (
                      <img src={comment.author.avatarUrl} alt="" style={coverImage} />
                    ) : (
                      comment.author?.displayName?.charAt(0).toUpperCase() || "?"
                    )}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text)" }}>
                    {comment.author?.displayName || tc("unknown")}
                  </span>
                  <span style={caption}>{formatDate(comment.createdAt)}</span>
                </div>
                <p
                  style={{
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {!editing &&
        entry.pluginRender?.map((block) => {
          if (block.type === "related-entries") {
            return <RelatedEntries key={block.id} entryId={Number(block.data?.entryId || entry.id)} />;
          }
          return null;
        })}

      {showPdfPasswordDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => {
            setShowPdfPasswordDialog(false);
            setPdfPassword("");
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              padding: 24,
              width: 360,
              maxWidth: "90vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.1rem",
                fontWeight: 400,
                color: "var(--text)",
                marginBottom: 4,
              }}
            >
              {t("exportAsPdf")}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>{t("pdfPasswordHint")}</p>
            <input
              type="password"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              placeholder={t("pdfPasswordPlaceholder")}
              style={{ ...inputStyle, marginBottom: 16 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") exportPdf();
              }}
              autoFocus
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => {
                  setShowPdfPasswordDialog(false);
                  setPdfPassword("");
                }}
                style={{
                  ...btnBase,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {tc("cancel")}
              </button>
              <button
                onClick={exportPdf}
                disabled={pdfExporting}
                style={{
                  ...btnBase,
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  opacity: pdfExporting ? 0.6 : 1,
                }}
              >
                {pdfExporting ? (
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                ) : (
                  <Download style={icon14} />
                )}
                {pdfExporting ? t("exporting") : t("exportPdf")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareDialog && (
        <ShareDialog entryId={entry.id} entryContent={entry.content} onClose={() => setShowShareDialog(false)} />
      )}

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
