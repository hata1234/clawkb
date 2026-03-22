"use client";

import { useState, useCallback } from "react";
import { Check, X, Loader2, Bot, Wifi, WifiOff } from "lucide-react";
import type { RagConfig } from "@/lib/settings";

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
  color: "var(--accent-contrast)",
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

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

async function saveSetting(key: string, value: unknown): Promise<boolean> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  return res.ok;
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      padding: "10px 16px", borderRadius: "var(--radius-md)",
      background: ok ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
      border: `1px solid ${ok ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
      color: ok ? "var(--success)" : "var(--danger)",
      fontSize: "0.875rem", fontWeight: 500,
      display: "flex", alignItems: "center", gap: 8,
      boxShadow: "var(--shadow-lg)",
    }}>
      {ok ? <Check style={{ width: 14, height: 14 }} /> : <X style={{ width: 14, height: 14 }} />}
      {msg}
    </div>
  );
}

export default function RagSettingsClient({ initialSettings }: { initialSettings: RagConfig }) {
  const [cfg, setCfg] = useState<RagConfig>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  async function save() {
    setSaving(true);
    const ok = await saveSetting("rag", cfg);
    setSaving(false);
    showToast(ok ? "RAG settings saved" : "Save failed", ok);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const baseUrl = cfg.baseUrl.replace(/\/$/, "");
      const testUrl = cfg.provider === "ollama"
        ? `${baseUrl.replace(/\/v1\/?$/, "")}/api/tags`
        : `${baseUrl}/models`;
      const headers: Record<string, string> = {};
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const res = await fetch(testUrl, { headers });
      setTestResult(res.ok
        ? { ok: true, message: `Connected to ${cfg.provider} (${res.status})` }
        : { ok: false, message: `Connection failed: ${res.status} ${res.statusText}` });
    } catch {
      setTestResult({ ok: false, message: "Network error — cannot reach the LLM endpoint" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <div style={card}>
        <div style={sectionTitle}>
          <Bot style={{ width: 16, height: 16, color: "var(--accent)" }} />
          RAG / AI Assistant
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
          Configure the LLM provider for the Ask AI feature. Uses an OpenAI-compatible chat completions API.
        </p>

        {/* Provider */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Provider</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["spark-vllm", "openai", "ollama", "disabled"] as const).map(p => (
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
                }}>
                {p === "spark-vllm" ? "Spark vLLM" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {cfg.provider !== "disabled" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Base URL</label>
              <input value={cfg.baseUrl} onChange={e => setCfg(c => ({ ...c, baseUrl: e.target.value }))}
                style={inputStyle} placeholder="http://192.168.1.113:8888/v1" />
            </div>
            <div>
              <label style={labelStyle}>Model</label>
              <input value={cfg.model} onChange={e => setCfg(c => ({ ...c, model: e.target.value }))}
                style={inputStyle} placeholder="Qwen/Qwen3.5-35B-A3B-FP8" />
            </div>
            <div>
              <label style={labelStyle}>API Key (optional)</label>
              <input type="password" value={cfg.apiKey} onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))}
                style={inputStyle} placeholder="Leave empty if not required" autoComplete="off" />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Top K (chunks to retrieve)</label>
                <input type="number" value={cfg.topK} onChange={e => setCfg(c => ({ ...c, topK: parseInt(e.target.value) || 5 }))}
                  style={inputStyle} min={1} max={20} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Max Tokens</label>
                <input type="number" value={cfg.maxTokens} onChange={e => setCfg(c => ({ ...c, maxTokens: parseInt(e.target.value) || 1024 }))}
                  style={inputStyle} min={256} max={8192} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>System Prompt</label>
              <textarea value={cfg.systemPrompt} onChange={e => setCfg(c => ({ ...c, systemPrompt: e.target.value }))}
                style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
            </div>
          </div>
        )}

        {cfg.provider === "disabled" && (
          <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginBottom: 20 }}>
            RAG is disabled. The Ask AI feature will be unavailable.
          </p>
        )}

        {testResult && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--radius-md)",
            background: testResult.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${testResult.ok ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
            color: testResult.ok ? "var(--success)" : "var(--danger)",
            fontSize: "0.8rem", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {testResult.ok ? <Wifi style={{ width: 14, height: 14 }} /> : <WifiOff style={{ width: 14, height: 14 }} />}
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

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        input:focus, textarea:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 2px rgba(201,169,110,0.15); }
        input::placeholder, textarea::placeholder { color: var(--text-dim); }
        input[type="password"] { color-scheme: dark; }
      `}</style>
    </div>
  );
}
