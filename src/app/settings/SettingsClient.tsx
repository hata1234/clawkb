"use client";

import { useState, useCallback } from "react";
import { Settings, Database, HardDrive, Type, Plus, Trash2, Edit2, Check, X, Loader2, Wifi, WifiOff } from "lucide-react";
import type { AllSettings, EntryTypeOption, StatusOption, EmbeddingConfig, StorageConfig } from "@/lib/settings";

// ─── Style constants ──────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "24px",
  marginBottom: 24,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  fontWeight: 500,
  marginBottom: 6,
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  background: "var(--accent)",
  color: "#0C0C0E",
  fontSize: "0.8rem",
  fontWeight: 600,
  borderRadius: "var(--radius-md)",
  border: "none",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "none",
  color: "var(--text-secondary)",
  fontSize: "0.8rem",
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
  fontSize: "0.75rem",
  border: "1px solid rgba(248,113,113,0.2)",
  borderRadius: "6px",
  cursor: "pointer",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  borderRadius: "var(--radius-md)",
  fontSize: "0.875rem",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
  background: active ? "var(--accent-muted)" : "none",
  color: active ? "var(--accent)" : "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.15s",
});

// ─── Save helper ──────────────────────────────────────────────────────────
async function saveSetting(key: string, value: unknown): Promise<boolean> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  return res.ok;
}

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 999,
      padding: "10px 16px",
      borderRadius: "var(--radius-md)",
      background: ok ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
      border: `1px solid ${ok ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
      color: ok ? "var(--success)" : "var(--danger)",
      fontSize: "0.875rem",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: 8,
      boxShadow: "var(--shadow-lg)",
    }}>
      {ok ? <Check style={{ width: 14, height: 14 }} /> : <X style={{ width: 14, height: 14 }} />}
      {msg}
    </div>
  );
}

// ─── Entry Types Tab ──────────────────────────────────────────────────────
function EntryTypesTab({ settings, onToast }: {
  settings: AllSettings;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [types, setTypes] = useState<EntryTypeOption[]>(settings.entry_types);
  const [sources, setSources] = useState<string[]>(settings.source_options);
  const [statuses, setStatuses] = useState<StatusOption[]>(settings.status_options);
  const [saving, setSaving] = useState(false);

  // New type form
  const [newType, setNewType] = useState({ id: "", label: "", icon: "📄" });
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState<EntryTypeOption>({ id: "", label: "", icon: "" });

  // New source
  const [newSource, setNewSource] = useState("");

  // New status
  const [newStatus, setNewStatus] = useState({ id: "", label: "" });
  const [editStatusIdx, setEditStatusIdx] = useState<number | null>(null);
  const [editStatusVal, setEditStatusVal] = useState<StatusOption>({ id: "", label: "" });

  async function save(key: string, value: unknown) {
    setSaving(true);
    const ok = await saveSetting(key, value);
    setSaving(false);
    onToast(ok ? "Saved" : "Save failed", ok);
  }

  // ── Entry Types ──
  function addType() {
    if (!newType.id || !newType.label) return;
    const updated = [...types, { ...newType }];
    setTypes(updated);
    setNewType({ id: "", label: "", icon: "📄" });
    save("entry_types", updated);
  }

  function startEditType(i: number) { setEditIdx(i); setEditVal({ ...types[i] }); }
  function saveEditType() {
    if (editIdx === null) return;
    const updated = types.map((t, i) => i === editIdx ? editVal : t);
    setTypes(updated); setEditIdx(null);
    save("entry_types", updated);
  }
  function deleteType(i: number) {
    const updated = types.filter((_, idx) => idx !== i);
    setTypes(updated);
    save("entry_types", updated);
  }

  // ── Sources ──
  function addSource() {
    if (!newSource.trim()) return;
    const updated = [...sources, newSource.trim()];
    setSources(updated); setNewSource("");
    save("source_options", updated);
  }
  function deleteSource(i: number) {
    const updated = sources.filter((_, idx) => idx !== i);
    setSources(updated);
    save("source_options", updated);
  }

  // ── Statuses ──
  function addStatus() {
    if (!newStatus.id || !newStatus.label) return;
    const updated = [...statuses, { ...newStatus }];
    setStatuses(updated); setNewStatus({ id: "", label: "" });
    save("status_options", updated);
  }
  function startEditStatus(i: number) { setEditStatusIdx(i); setEditStatusVal({ ...statuses[i] }); }
  function saveEditStatus() {
    if (editStatusIdx === null) return;
    const updated = statuses.map((s, i) => i === editStatusIdx ? editStatusVal : s);
    setStatuses(updated); setEditStatusIdx(null);
    save("status_options", updated);
  }
  function deleteStatus(i: number) {
    const updated = statuses.filter((_, idx) => idx !== i);
    setStatuses(updated);
    save("status_options", updated);
  }

  return (
    <div>
      {/* Entry Types */}
      <div style={card}>
        <div style={sectionTitle}>
          <Type style={{ width: 16, height: 16, color: "var(--accent)" }} />
          Entry Types
          {saving && <Loader2 style={{ width: 14, height: 14, marginLeft: "auto", color: "var(--text-dim)" }} className="spin" />}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {types.map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}>
              {editIdx === i ? (
                <>
                  <input value={editVal.icon} onChange={e => setEditVal(v => ({ ...v, icon: e.target.value }))}
                    style={{ ...inputStyle, width: 56 }} placeholder="🏷️" />
                  <input value={editVal.label} onChange={e => setEditVal(v => ({ ...v, label: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }} placeholder="Label" />
                  <input value={editVal.id} onChange={e => setEditVal(v => ({ ...v, id: e.target.value }))}
                    style={{ ...inputStyle, width: 120, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }} placeholder="id_key" />
                  <button onClick={saveEditType} style={{ ...btnPrimary, padding: "4px 10px" }}><Check style={{ width: 14, height: 14 }} /></button>
                  <button onClick={() => setEditIdx(null)} style={{ ...btnGhost, padding: "4px 10px" }}><X style={{ width: 14, height: 14 }} /></button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{t.icon}</span>
                  <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text)" }}>{t.label}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{t.id}</span>
                  <button onClick={() => startEditType(i)} style={{ ...btnGhost, padding: "4px 8px" }}><Edit2 style={{ width: 12, height: 12 }} /></button>
                  <button onClick={() => deleteType(i)} style={btnDanger}><Trash2 style={{ width: 12, height: 12 }} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new type */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ width: 64 }}>
            <label style={labelStyle}>Icon</label>
            <input value={newType.icon} onChange={e => setNewType(v => ({ ...v, icon: e.target.value }))}
              style={{ ...inputStyle, textAlign: "center" }} placeholder="💡" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Label</label>
            <input value={newType.label} onChange={e => setNewType(v => ({ ...v, label: e.target.value }))}
              style={inputStyle} placeholder="New Type" />
          </div>
          <div style={{ width: 140 }}>
            <label style={labelStyle}>ID (snake_case)</label>
            <input value={newType.id} onChange={e => setNewType(v => ({ ...v, id: e.target.value.replace(/\s+/g, "_").toLowerCase() }))}
              style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }} placeholder="new_type" />
          </div>
          <button onClick={addType} style={btnPrimary}>
            <Plus style={{ width: 14, height: 14 }} /> Add
          </button>
        </div>
      </div>

      {/* Source Options */}
      <div style={card}>
        <div style={sectionTitle}>
          <Database style={{ width: 16, height: 16, color: "var(--accent)" }} />
          Source Options
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {sources.map((s, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}>
              {s}
              <button onClick={() => deleteSource(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 0, display: "flex" }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newSource} onChange={e => setNewSource(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addSource()}
            style={{ ...inputStyle, flex: 1 }} placeholder="new-source" />
          <button onClick={addSource} style={btnPrimary}>
            <Plus style={{ width: 14, height: 14 }} /> Add
          </button>
        </div>
      </div>

      {/* Status Options */}
      <div style={card}>
        <div style={sectionTitle}>
          <Settings style={{ width: 16, height: 16, color: "var(--accent)" }} />
          Status Options
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {statuses.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}>
              {editStatusIdx === i ? (
                <>
                  <input value={editStatusVal.label} onChange={e => setEditStatusVal(v => ({ ...v, label: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }} placeholder="Label" />
                  <input value={editStatusVal.id} onChange={e => setEditStatusVal(v => ({ ...v, id: e.target.value.toLowerCase() }))}
                    style={{ ...inputStyle, width: 120, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }} placeholder="id" />
                  <button onClick={saveEditStatus} style={{ ...btnPrimary, padding: "4px 10px" }}><Check style={{ width: 14, height: 14 }} /></button>
                  <button onClick={() => setEditStatusIdx(null)} style={{ ...btnGhost, padding: "4px 10px" }}><X style={{ width: 14, height: 14 }} /></button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text)" }}>{s.label}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{s.id}</span>
                  <button onClick={() => startEditStatus(i)} style={{ ...btnGhost, padding: "4px 8px" }}><Edit2 style={{ width: 12, height: 12 }} /></button>
                  <button onClick={() => deleteStatus(i)} style={btnDanger}><Trash2 style={{ width: 12, height: 12 }} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Label</label>
            <input value={newStatus.label} onChange={e => setNewStatus(v => ({ ...v, label: e.target.value }))}
              style={inputStyle} placeholder="Archived" />
          </div>
          <div style={{ width: 140 }}>
            <label style={labelStyle}>ID</label>
            <input value={newStatus.id} onChange={e => setNewStatus(v => ({ ...v, id: e.target.value.replace(/\s+/g, "_").toLowerCase() }))}
              style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }} placeholder="archived" />
          </div>
          <button onClick={addStatus} style={btnPrimary}>
            <Plus style={{ width: 14, height: 14 }} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Embedding Tab ────────────────────────────────────────────────────────
function EmbeddingTab({ settings, onToast }: {
  settings: AllSettings;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [cfg, setCfg] = useState<EmbeddingConfig>(settings.embedding);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function save() {
    setSaving(true);
    const ok = await saveSetting("embedding", cfg);
    setSaving(false);
    onToast(ok ? "Embedding settings saved" : "Save failed", ok);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={card}>
      <div style={sectionTitle}>
        <Database style={{ width: 16, height: 16, color: "var(--accent)" }} />
        Embedding Provider
      </div>

      {/* Provider selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Provider</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["ollama", "openai", "disabled"] as const).map(p => (
            <button key={p} onClick={() => setCfg(c => ({ ...c, provider: p }))}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${cfg.provider === p ? "var(--accent)" : "var(--border)"}`,
                background: cfg.provider === p ? "var(--accent-muted)" : "var(--background)",
                color: cfg.provider === p ? "var(--accent)" : "var(--text-secondary)",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Ollama fields */}
      {cfg.provider === "ollama" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Ollama URL</label>
            <input value={cfg.ollamaUrl ?? ""} onChange={e => setCfg(c => ({ ...c, ollamaUrl: e.target.value }))}
              style={inputStyle} placeholder="http://192.168.0.85:11434" />
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <input value={cfg.ollamaModel ?? ""} onChange={e => setCfg(c => ({ ...c, ollamaModel: e.target.value }))}
              style={inputStyle} placeholder="bge-m3" />
          </div>
        </div>
      )}

      {/* OpenAI fields */}
      {cfg.provider === "openai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>API Key</label>
            <input type="password" value={cfg.openaiApiKey ?? ""} onChange={e => setCfg(c => ({ ...c, openaiApiKey: e.target.value }))}
              style={inputStyle} placeholder="sk-..." autoComplete="off" />
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <input value={cfg.openaiModel ?? ""} onChange={e => setCfg(c => ({ ...c, openaiModel: e.target.value }))}
              style={inputStyle} placeholder="text-embedding-3-small" />
          </div>
        </div>
      )}

      {cfg.provider === "disabled" && (
        <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginBottom: 20 }}>
          Embedding is disabled. Semantic search will be unavailable.
        </p>
      )}

      {/* Test result */}
      {testResult && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          background: testResult.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
          border: `1px solid ${testResult.ok ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
          color: testResult.ok ? "var(--success)" : "var(--danger)",
          fontSize: "0.8rem",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          {testResult.ok
            ? <Wifi style={{ width: 14, height: 14 }} />
            : <WifiOff style={{ width: 14, height: 14 }} />}
          {testResult.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Check style={{ width: 14, height: 14 }} />}
          Save
        </button>
        {cfg.provider !== "disabled" && (
          <button onClick={testConnection} disabled={testing} style={{ ...btnGhost, opacity: testing ? 0.6 : 1 }}>
            {testing ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Wifi style={{ width: 14, height: 14 }} />}
            Test Connection
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Storage Tab ──────────────────────────────────────────────────────────
function StorageTab({ settings, onToast }: {
  settings: AllSettings;
  onToast: (msg: string, ok: boolean) => void;
}) {
  const [cfg, setCfg] = useState<StorageConfig>(settings.storage);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function save() {
    setSaving(true);
    const ok = await saveSetting("storage", cfg);
    setSaving(false);
    onToast(ok ? "Storage settings saved" : "Save failed", ok);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  const field = (label: string, key: keyof StorageConfig, opts?: { type?: string; placeholder?: string }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={opts?.type ?? "text"}
        value={String(cfg[key])}
        onChange={e => setCfg(c => ({ ...c, [key]: key === "port" ? parseInt(e.target.value) || 0 : e.target.value }))}
        style={inputStyle}
        placeholder={opts?.placeholder}
        autoComplete="off"
      />
    </div>
  );

  return (
    <div style={card}>
      <div style={sectionTitle}>
        <HardDrive style={{ width: 16, height: 16, color: "var(--accent)" }} />
        Object Storage (S3-compatible)
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>{field("Endpoint", "endpoint", { placeholder: "192.168.1.62" })}</div>
          <div style={{ width: 100 }}>{field("Port", "port", { placeholder: "9000" })}</div>
        </div>

        {/* SSL toggle */}
        <div>
          <label style={labelStyle}>SSL</label>
          <button
            onClick={() => setCfg(c => ({ ...c, useSSL: !c.useSSL }))}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px",
              background: cfg.useSSL ? "rgba(74,222,128,0.1)" : "var(--background)",
              border: `1px solid ${cfg.useSSL ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)",
              color: cfg.useSSL ? "var(--success)" : "var(--text-secondary)",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}>
            <div style={{
              width: 36, height: 20, borderRadius: 10,
              background: cfg.useSSL ? "var(--success)" : "var(--border)",
              position: "relative", transition: "background 0.15s",
            }}>
              <div style={{
                position: "absolute", top: 2, left: cfg.useSSL ? 18 : 2,
                width: 16, height: 16, borderRadius: "50%",
                background: "#fff", transition: "left 0.15s",
              }} />
            </div>
            {cfg.useSSL ? "HTTPS enabled" : "HTTP (no SSL)"}
          </button>
        </div>

        {field("Access Key", "accessKey", { placeholder: "minioadmin" })}
        {field("Secret Key", "secretKey", { type: "password", placeholder: "••••••••" })}
        {field("Bucket", "bucket", { placeholder: "knowledge-hub" })}
        {field("Public URL", "publicUrl", { placeholder: "https://minio.cellar.men/knowledge-hub" })}
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          background: testResult.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
          border: `1px solid ${testResult.ok ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
          color: testResult.ok ? "var(--success)" : "var(--danger)",
          fontSize: "0.8rem",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          {testResult.ok
            ? <Wifi style={{ width: 14, height: 14 }} />
            : <WifiOff style={{ width: 14, height: 14 }} />}
          {testResult.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Check style={{ width: 14, height: 14 }} />}
          Save
        </button>
        <button onClick={testConnection} disabled={testing} style={{ ...btnGhost, opacity: testing ? 0.6 : 1 }}>
          {testing ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Wifi style={{ width: 14, height: 14 }} />}
          Test Connection
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
type Tab = "types" | "embedding" | "storage";

export default function SettingsClient({ initialSettings }: { initialSettings: AllSettings }) {
  const [activeTab, setActiveTab] = useState<Tab>("types");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Configure entry types, embedding provider, and object storage.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4,
        padding: 4,
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        marginBottom: 24,
        width: "fit-content",
      }}>
        <button onClick={() => setActiveTab("types")} style={tabBtn(activeTab === "types")}>
          <Type style={{ width: 14, height: 14 }} /> Entry Types
        </button>
        <button onClick={() => setActiveTab("embedding")} style={tabBtn(activeTab === "embedding")}>
          <Database style={{ width: 14, height: 14 }} /> Embedding
        </button>
        <button onClick={() => setActiveTab("storage")} style={tabBtn(activeTab === "storage")}>
          <HardDrive style={{ width: 14, height: 14 }} /> Storage
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "types"     && <EntryTypesTab settings={initialSettings} onToast={showToast} />}
      {activeTab === "embedding" && <EmbeddingTab  settings={initialSettings} onToast={showToast} />}
      {activeTab === "storage"   && <StorageTab    settings={initialSettings} onToast={showToast} />}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 2px rgba(201,169,110,0.15); }
        input[type="password"] { color-scheme: dark; }
        input::placeholder { color: var(--text-dim); }
      `}</style>
    </div>
  );
}
