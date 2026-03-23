"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

interface TrashEntry {
  id: number;
  type: string;
  title: string;
  source: string;
  createdAt: string;
  deletedAt: string | null;
  author?: { id: number; displayName: string; avatarUrl: string | null } | null;
}

export default function TrashPage() {
  const t = useTranslations("Trash");
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/trash")
      .then((res) => {
        if (res.status === 403) return { entries: [] };
        return res.json();
      })
      .then((data) => {
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const restoreEntry = async (id: number) => {
    setActionId(id);
    const res = await fetch(`/api/entries/${id}/restore`, { method: "POST" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    setActionId(null);
  };

  const permanentDelete = async (id: number) => {
    if (!confirm(t("deleteConfirm"))) return;
    setActionId(id);
    const res = await fetch(`/api/entries/${id}/permanent`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    setActionId(null);
  };

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: "var(--radius-md)",
    fontSize: "0.75rem",
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s ease",
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--text-dim)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {t("label")}
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>
          {t("title")}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 2 }}>
          {t("count", { count: entries.length })}
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Loader2
            style={{ width: 24, height: 24, color: "var(--text-muted)", animation: "spin 1s linear infinite" }}
          />
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <Trash2 style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: "0.875rem" }}>{t("empty")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Link
                  href={`/entries/${entry.id}`}
                  style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text)", textDecoration: "none" }}
                >
                  {entry.title}
                </Link>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 4, display: "flex", gap: 8 }}>
                  <span>{entry.type}</span>
                  <span>·</span>
                  <span>{entry.source}</span>
                  {entry.deletedAt && (
                    <>
                      <span>·</span>
                      <span>deleted {formatRelativeDate(entry.deletedAt)}</span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => restoreEntry(entry.id)}
                  disabled={actionId === entry.id}
                  style={{ ...btnBase, background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {actionId === entry.id ? (
                    <Loader2 style={{ width: 12, height: 12 }} />
                  ) : (
                    <RotateCcw style={{ width: 12, height: 12 }} />
                  )}{" "}
                  {t("restore")}
                </button>
                <button
                  onClick={() => permanentDelete(entry.id)}
                  disabled={actionId === entry.id}
                  style={{
                    ...btnBase,
                    background: "rgba(248,113,113,0.06)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    color: "var(--danger)",
                  }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} /> {t("deleteForever")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
