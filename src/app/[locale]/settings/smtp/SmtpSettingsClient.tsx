"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Loader2, Mail, Wifi, WifiOff } from "lucide-react";
import type { SmtpConfig } from "@/lib/settings";

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

export default function SmtpSettingsClient({ initialSettings }: { initialSettings: SmtpConfig }) {
  const t = useTranslations("SmtpSettings");
  const tc = useTranslations("Common");
  const [cfg, setCfg] = useState<SmtpConfig>(initialSettings);
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
    const ok = await saveSetting("smtp", cfg);
    setSaving(false);
    showToast(ok ? t("saved") : tc("saveFailed"), ok);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, message: data.message || (res.ok ? t("testSuccess") : t("testFailed")) });
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
          <Mail style={{ width: 16, height: 16, color: "var(--accent)" }} />
          {t("title")}
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
          {t("description")}
        </p>

        {/* Enabled toggle */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ ...labelStyle, marginBottom: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={e => setCfg(c => ({ ...c, enabled: e.target.checked }))}
              style={{ accentColor: "var(--accent)" }}
            />
            {t("enableSmtp")}
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>{t("host")}</label>
              <input value={cfg.host} onChange={e => setCfg(c => ({ ...c, host: e.target.value }))}
                style={inputStyle} placeholder="smtp.example.com" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("port")}</label>
              <input type="number" value={cfg.port} onChange={e => setCfg(c => ({ ...c, port: parseInt(e.target.value) || 587 }))}
                style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ ...labelStyle, marginBottom: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={cfg.secure}
                onChange={e => setCfg(c => ({ ...c, secure: e.target.checked }))}
                style={{ accentColor: "var(--accent)" }}
              />
              {t("secure")}
            </label>
          </div>
          <div>
            <label style={labelStyle}>{t("username")}</label>
            <input value={cfg.user} onChange={e => setCfg(c => ({ ...c, user: e.target.value }))}
              style={inputStyle} placeholder={t("usernamePlaceholder")} autoComplete="off" />
          </div>
          <div>
            <label style={labelStyle}>{t("password")}</label>
            <input type="password" value={cfg.pass} onChange={e => setCfg(c => ({ ...c, pass: e.target.value }))}
              style={inputStyle} placeholder={t("passwordPlaceholder")} autoComplete="off" />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("fromAddress")}</label>
              <input value={cfg.fromAddress} onChange={e => setCfg(c => ({ ...c, fromAddress: e.target.value }))}
                style={inputStyle} placeholder="noreply@example.com" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t("fromName")}</label>
              <input value={cfg.fromName} onChange={e => setCfg(c => ({ ...c, fromName: e.target.value }))}
                style={inputStyle} placeholder="ClawKB" />
            </div>
          </div>
        </div>

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
            {tc("save")}
          </button>
          <button onClick={testConnection} disabled={testing || !cfg.host} style={{ ...btnGhost, opacity: testing ? 0.6 : 1 }}>
            {testing ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Mail style={{ width: 14, height: 14 }} />}
            {tc("testConnection")}
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 2px rgba(201,169,110,0.15); }
        input::placeholder { color: var(--text-dim); }
        input[type="password"] { color-scheme: dark; }
      `}</style>
    </div>
  );
}
