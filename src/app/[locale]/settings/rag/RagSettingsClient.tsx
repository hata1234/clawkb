"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Loader2, Bot, Wifi, WifiOff } from "lucide-react";
import type { RagConfig } from "@/lib/settings";
import {
  settingsCard as card,
  settingsInputStyle as inputStyle,
  settingsLabelStyle as labelStyle,
  settingsBtnPrimary as btnPrimary,
  settingsBtnGhost as btnGhost,
  settingsSectionTitle as sectionTitle,
} from "@/lib/settings-styles";

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
    <div
      style={{
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
      }}
    >
      {ok ? <Check style={{ width: 14, height: 14 }} /> : <X style={{ width: 14, height: 14 }} />}
      {msg}
    </div>
  );
}

export default function RagSettingsClient({ initialSettings }: { initialSettings: RagConfig }) {
  const t = useTranslations("RagSettings");
  const tc = useTranslations("Common");
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
    showToast(ok ? t("ragSettingsSaved") : tc("saveFailed"), ok);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const baseUrl = cfg.baseUrl.replace(/\/$/, "");
      const testUrl = cfg.provider === "ollama" ? `${baseUrl.replace(/\/v1\/?$/, "")}/api/tags` : `${baseUrl}/models`;
      const headers: Record<string, string> = {};
      if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      const res = await fetch(testUrl, { headers });
      setTestResult(
        res.ok
          ? { ok: true, message: t("connectedTo", { provider: cfg.provider, status: res.status }) }
          : { ok: false, message: t("connectionFailed", { status: res.status, statusText: res.statusText }) },
      );
    } catch {
      setTestResult({ ok: false, message: t("networkError") });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <div style={card}>
        <div style={sectionTitle}>
          <Bot style={{ width: 16, height: 16, color: "var(--accent)" }} />
          {t("ragAiAssistant")}
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
          {t("ragDescription")}
        </p>

        {/* Provider */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t("provider")}</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["spark-vllm", "openai", "ollama", "disabled"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setCfg((c) => ({ ...c, provider: p }))}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${cfg.provider === p ? "var(--accent)" : "var(--border)"}`,
                  background: cfg.provider === p ? "var(--accent-muted)" : "var(--background)",
                  color: cfg.provider === p ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {p === "spark-vllm" ? "Spark vLLM" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {cfg.provider !== "disabled" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>{t("baseUrl")}</label>
              <input
                value={cfg.baseUrl}
                onChange={(e) => setCfg((c) => ({ ...c, baseUrl: e.target.value }))}
                style={inputStyle}
                placeholder="http://localhost:8888/v1"
              />
            </div>
            <div>
              <label style={labelStyle}>{t("model")}</label>
              <input
                value={cfg.model}
                onChange={(e) => setCfg((c) => ({ ...c, model: e.target.value }))}
                style={inputStyle}
                placeholder="Qwen/Qwen3.5-35B-A3B-FP8"
              />
            </div>
            <div>
              <label style={labelStyle}>{t("apiKeyOptional")}</label>
              <input
                type="password"
                value={cfg.apiKey}
                onChange={(e) => setCfg((c) => ({ ...c, apiKey: e.target.value }))}
                style={inputStyle}
                placeholder={t("apiKeyPlaceholder")}
                autoComplete="off"
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{t("topK")}</label>
                <input
                  type="number"
                  value={cfg.topK}
                  onChange={(e) => setCfg((c) => ({ ...c, topK: parseInt(e.target.value) || 5 }))}
                  style={inputStyle}
                  min={1}
                  max={20}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{t("maxTokens")}</label>
                <input
                  type="number"
                  value={cfg.maxTokens}
                  onChange={(e) => setCfg((c) => ({ ...c, maxTokens: parseInt(e.target.value) || 1024 }))}
                  style={inputStyle}
                  min={256}
                  max={8192}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t("systemPrompt")}</label>
              <textarea
                value={cfg.systemPrompt}
                onChange={(e) => setCfg((c) => ({ ...c, systemPrompt: e.target.value }))}
                style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </div>
          </div>
        )}

        {cfg.provider === "disabled" && (
          <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginBottom: 20 }}>{t("ragDisabledMessage")}</p>
        )}

        {testResult && (
          <div
            style={{
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
            }}
          >
            {testResult.ok ? <Wifi style={{ width: 14, height: 14 }} /> : <WifiOff style={{ width: 14, height: 14 }} />}
            {testResult.message}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? (
              <Loader2 style={{ width: 14, height: 14 }} className="spin" />
            ) : (
              <Check style={{ width: 14, height: 14 }} />
            )}
            {tc("save")}
          </button>
          {cfg.provider !== "disabled" && (
            <button onClick={testConnection} disabled={testing} style={{ ...btnGhost, opacity: testing ? 0.6 : 1 }}>
              {testing ? (
                <Loader2 style={{ width: 14, height: 14 }} className="spin" />
              ) : (
                <Wifi style={{ width: 14, height: 14 }} />
              )}
              {tc("testConnection")}
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
