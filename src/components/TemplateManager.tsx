"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Edit2, Check, X, Loader2, LayoutTemplate, GripVertical } from "lucide-react";

interface EntryTemplate {
  id: string;
  name: string;
  type?: string;
  source?: string;
  status?: string;
  tags?: string;
  summary?: string;
  content?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 10px",
  fontSize: "0.82rem",
  color: "var(--text)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  color: "var(--text-dim)",
  fontWeight: 600,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "7px 14px",
  background: "var(--accent)",
  color: "var(--accent-contrast)",
  fontSize: "0.78rem",
  fontWeight: 600,
  borderRadius: "var(--radius-md)",
  border: "none",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  background: "none",
  color: "var(--text-secondary)",
  fontSize: "0.78rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
  background: "rgba(248,113,113,0.1)",
  color: "var(--danger)",
  fontSize: "0.72rem",
  border: "1px solid rgba(248,113,113,0.2)",
  borderRadius: "6px",
  cursor: "pointer",
};

export default function TemplateManager() {
  const t = useTranslations("TemplateManager");
  const tc = useTranslations("Common");
  const [templates, setTemplates] = useState<EntryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EntryTemplate>>({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<Partial<EntryTemplate>>({ name: "" });
  const [toast, setToast] = useState("");

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/plugins/entry-templates/templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTemplate() {
    if (!newForm.name?.trim()) return;
    setSaving(true);
    const res = await fetch("/api/plugins/entry-templates/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    setSaving(false);
    if (res.ok) {
      setNewForm({ name: "" });
      setShowNew(false);
      flash(t("templateCreated"));
      load();
    }
  }

  async function updateTemplate() {
    if (!editId) return;
    setSaving(true);
    const res = await fetch(`/api/plugins/entry-templates/templates/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      setEditId(null);
      flash(t("templateUpdated"));
      load();
    }
  }

  async function deleteTemplate(id: string) {
    const res = await fetch(`/api/plugins/entry-templates/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      flash(t("templateDeleted"));
      load();
    }
  }

  function startEdit(tpl: EntryTemplate) {
    setEditId(tpl.id);
    setEditForm({ ...tpl });
    setShowNew(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
        <Loader2 style={{ width: 20, height: 20, color: "var(--text-dim)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Template list */}
      {templates.length === 0 && !showNew && (
        <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-dim)" }}>
          <LayoutTemplate style={{ width: 32, height: 32, margin: "0 auto 8px", opacity: 0.3 }} />
          <p style={{ fontSize: "0.82rem" }}>{t("noTemplates")}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            style={{
              background: "var(--background)",
              border: editId === tpl.id ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
            }}
          >
            {editId === tpl.id ? (
              /* ── Edit Mode ── */
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>{t("name")}</label>
                    <input
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("type")}</label>
                    <input
                      value={editForm.type || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. report"
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>{t("source")}</label>
                    <input
                      value={editForm.source || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, source: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. manual"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("status")}</label>
                    <input
                      value={editForm.status || ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      style={inputStyle}
                      placeholder="e.g. new"
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("tags")}</label>
                  <input
                    value={editForm.tags || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                    style={inputStyle}
                    placeholder={t("commaSeparated")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("summaryTemplate")}</label>
                  <input
                    value={editForm.summary || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
                    style={inputStyle}
                    placeholder={t("optional")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("contentTemplate")}</label>
                  <textarea
                    value={editForm.content || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                    style={{
                      ...inputStyle,
                      minHeight: 120,
                      resize: "vertical",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.78rem",
                    }}
                    placeholder="## Section 1&#10;&#10;## Section 2"
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={updateTemplate} disabled={saving} style={btnPrimary}>
                    <Check style={{ width: 12, height: 12 }} /> {tc("save")}
                  </button>
                  <button onClick={() => setEditId(null)} style={btnGhost}>
                    <X style={{ width: 12, height: 12 }} /> {tc("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              /* ── View Mode ── */
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <GripVertical
                  style={{ width: 14, height: 14, color: "var(--text-dim)", flexShrink: 0, opacity: 0.4 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--text)" }}>{tpl.name}</div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-dim)",
                      marginTop: 2,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {tpl.type && <span>type: {tpl.type}</span>}
                    {tpl.source && <span>· source: {tpl.source}</span>}
                    {tpl.status && <span>· status: {tpl.status}</span>}
                    {tpl.tags && <span>· tags: {tpl.tags}</span>}
                  </div>
                </div>
                <button onClick={() => startEdit(tpl)} style={{ ...btnGhost, padding: "4px 8px" }}>
                  <Edit2 style={{ width: 12, height: 12 }} />
                </button>
                <button onClick={() => deleteTemplate(tpl.id)} style={btnDanger}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New template form */}
      {showNew && (
        <div
          style={{
            background: "var(--background)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-md)",
            padding: "14px",
            marginTop: 8,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>{t("name")} *</label>
                <input
                  value={newForm.name || ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. Weekly Report"
                />
              </div>
              <div>
                <label style={labelStyle}>{t("type")}</label>
                <input
                  value={newForm.type || ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. report"
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>{t("source")}</label>
                <input
                  value={newForm.source || ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, source: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. manual"
                />
              </div>
              <div>
                <label style={labelStyle}>{t("status")}</label>
                <input
                  value={newForm.status || ""}
                  onChange={(e) => setNewForm((f) => ({ ...f, status: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. new"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t("tags")}</label>
              <input
                value={newForm.tags || ""}
                onChange={(e) => setNewForm((f) => ({ ...f, tags: e.target.value }))}
                style={inputStyle}
                placeholder={t("commaSeparated")}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("contentTemplate")}</label>
              <textarea
                value={newForm.content || ""}
                onChange={(e) => setNewForm((f) => ({ ...f, content: e.target.value }))}
                style={{
                  ...inputStyle,
                  minHeight: 100,
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                }}
                placeholder="## Section 1&#10;&#10;## Section 2"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={createTemplate}
                disabled={saving || !newForm.name?.trim()}
                style={{ ...btnPrimary, opacity: saving || !newForm.name?.trim() ? 0.5 : 1 }}
              >
                <Plus style={{ width: 12, height: 12 }} /> {tc("create")}
              </button>
              <button
                onClick={() => {
                  setShowNew(false);
                  setNewForm({ name: "" });
                }}
                style={btnGhost}
              >
                <X style={{ width: 12, height: 12 }} /> {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showNew && editId === null && (
        <button onClick={() => setShowNew(true)} style={{ ...btnPrimary, marginTop: 12 }}>
          <Plus style={{ width: 12, height: 12 }} /> {t("addTemplate")}
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            marginTop: 8,
            fontSize: "0.8rem",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Check style={{ width: 12, height: 12 }} /> {toast}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: var(--accent) !important; }
      `}</style>
    </div>
  );
}
