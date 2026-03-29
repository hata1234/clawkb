"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Loader2, Bot, Wifi, WifiOff, RefreshCw, ChevronDown } from "lucide-react";
import type { RagConfig } from "@/lib/settings";
import {
  settingsCard as card,
  settingsInputStyle as inputStyle,
  settingsLabelStyle as labelStyle,
  settingsBtnPrimary as btnPrimary,
  settingsBtnGhost as btnGhost,
  settingsSectionTitle as sectionTitle,
} from "@/lib/settings-styles";

type Provider = "openai" | "openclaw" | "ollama" | "disabled";

const PROVIDER_DEFAULTS: Record<Exclude<Provider, "disabled">, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  openclaw: { baseUrl: "http://localhost:18789/v1", model: "" },
  ollama: { baseUrl: "http://localhost:11434", model: "" },
};

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  openclaw: "OpenClaw",
  ollama: "Ollama",
  disabled: "Disabled",
};

interface ModelOption {
  id: string;
  name: string;
}

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

  // Migrate old "spark-vllm" provider to "openai" (OpenAI-compatible)
  const migratedInitial: RagConfig = {
    ...initialSettings,
    provider: initialSettings.provider === ("spark-vllm" as string) ? "openai" : initialSettings.provider,
  };

  const [cfg, setCfg] = useState<RagConfig>(migratedInitial);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch models when provider/baseUrl/apiKey changes
  const fetchModels = useCallback(async (provider: string, baseUrl: string, apiKey: string) => {
    if (provider === "disabled" || !baseUrl) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    setModelError(null);
    try {
      const params = new URLSearchParams({ baseUrl, apiKey, provider });
      const res = await fetch(`/api/rag/models?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setModelError(data.error || `HTTP ${res.status}`);
        setModels([]);
        return;
      }
      const data = await res.json();
      setModels(data.models || []);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : "Failed to fetch models");
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Auto-fetch models on mount if provider is active
  useEffect(() => {
    if (cfg.provider !== "disabled" && cfg.baseUrl) {
      fetchModels(cfg.provider, cfg.baseUrl, cfg.apiKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchProvider(p: Provider) {
    if (p === "disabled") {
      setCfg((c) => ({ ...c, provider: p }));
      setModels([]);
      return;
    }
    const defaults = PROVIDER_DEFAULTS[p];
    const newCfg = {
      ...cfg,
      provider: p,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      apiKey: p === "openai" ? cfg.apiKey : "", // preserve API key when switching to OpenAI
    };
    setCfg(newCfg);
    fetchModels(p, defaults.baseUrl, newCfg.apiKey);
  }

  function resetToDefaults() {
    if (cfg.provider === "disabled") return;
    const defaults = PROVIDER_DEFAULTS[cfg.provider];
    setCfg((c) => ({ ...c, baseUrl: defaults.baseUrl, model: defaults.model }));
    fetchModels(cfg.provider, defaults.baseUrl, cfg.apiKey);
  }

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
      // Use server-side proxy to avoid CORS issues with internal LLM endpoints
      const res = await fetch("/api/rag/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: cfg.provider, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey }),
      });
      const data = await res.json();
      setTestResult(
        data.ok
          ? { ok: true, message: t("connectedTo", { provider: PROVIDER_LABELS[cfg.provider], status: 200 }) }
          : { ok: false, message: data.error || t("connectionFailed", { status: data.status ?? "?", statusText: data.statusText ?? "" }) },
      );
    } catch (err) {
      setTestResult({ ok: false, message: t("networkError") });
    } finally {
      setTesting(false);
    }
  }

  const filteredModels = models;

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
            {(["openai", "openclaw", "ollama", "disabled"] as const).map((p) => (
              <button
                key={p}
                onClick={() => switchProvider(p)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${cfg.provider === p ? "var(--accent)" : "var(--border)"}`,
                  background: cfg.provider === p ? "var(--accent-muted)" : "var(--background)",
                  color: cfg.provider === p ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
          {cfg.provider === "openclaw" && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
              Routes through your OpenClaw gateway. Supports all configured models (local + cloud).
            </p>
          )}
        </div>

        {cfg.provider !== "disabled" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {/* Base URL + Reset */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={labelStyle}>{t("baseUrl")}</label>
                <button
                  onClick={resetToDefaults}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 4px",
                  }}
                  title="Reset to defaults"
                >
                  <RefreshCw style={{ width: 11, height: 11 }} />
                  Reset
                </button>
              </div>
              <input
                value={cfg.baseUrl}
                onChange={(e) => setCfg((c) => ({ ...c, baseUrl: e.target.value }))}
                style={inputStyle}
                placeholder={PROVIDER_DEFAULTS[cfg.provider]?.baseUrl || ""}
              />
            </div>

            {/* Model — dropdown with fetch */}
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={labelStyle}>{t("model")}</label>
                <button
                  onClick={() => fetchModels(cfg.provider, cfg.baseUrl, cfg.apiKey)}
                  disabled={loadingModels}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.7rem",
                    cursor: loadingModels ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 4px",
                  }}
                  title="Refresh model list"
                >
                  {loadingModels ? (
                    <Loader2 style={{ width: 11, height: 11 }} className="spin" />
                  ) : (
                    <RefreshCw style={{ width: 11, height: 11 }} />
                  )}
                  Fetch Models
                </button>
              </div>

              {/* Model selector */}
              <div
                style={{ position: "relative" }}
                onBlur={(e) => {
                  // Close dropdown if focus leaves this container
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setTimeout(() => setShowDropdown(false), 150);
                  }
                }}
              >
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  style={{
                    ...inputStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    color: cfg.model ? "var(--text)" : "var(--text-dim)",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {cfg.model || "Select a model..."}
                  </span>
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      transform: showDropdown ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  />
                </button>

                {showDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      marginTop: 4,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lg)",
                      maxHeight: 280,
                      overflowY: "auto",
                    }}
                  >
                    {/* Manual input option */}
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                      <input
                        autoFocus
                        value={cfg.model}
                        onChange={(e) => setCfg((c) => ({ ...c, model: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setShowDropdown(false);
                        }}
                        style={{
                          ...inputStyle,
                          marginBottom: 0,
                          fontSize: "0.8rem",
                        }}
                        placeholder="Type model name or select below..."
                      />
                    </div>

                    {loadingModels && (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "0.8rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                        Loading models...
                      </div>
                    )}

                    {modelError && (
                      <div
                        style={{
                          padding: "12px",
                          color: "var(--danger)",
                          fontSize: "0.78rem",
                        }}
                      >
                        {modelError}
                      </div>
                    )}

                    {!loadingModels && !modelError && filteredModels.length === 0 && (
                      <div
                        style={{
                          padding: "12px",
                          color: "var(--text-muted)",
                          fontSize: "0.78rem",
                          textAlign: "center",
                        }}
                      >
                        No models found. Check connection or type manually.
                      </div>
                    )}

                    {filteredModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setCfg((c) => ({ ...c, model: m.id }));
                          setShowDropdown(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 12px",
                          background: cfg.model === m.id ? "var(--accent-muted)" : "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border)",
                          color: cfg.model === m.id ? "var(--accent)" : "var(--text)",
                          fontSize: "0.82rem",
                          textAlign: "left",
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) => {
                          if (cfg.model !== m.id) e.currentTarget.style.background = "var(--surface-hover)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = cfg.model === m.id ? "var(--accent-muted)" : "transparent";
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label style={labelStyle}>
                {t("apiKeyOptional")}
                {cfg.provider === "openclaw" && (
                  <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>
                    (usually not needed)
                  </span>
                )}
              </label>
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
