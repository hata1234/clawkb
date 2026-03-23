"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type PrefValue = "all" | "inapp" | "off";

interface Prefs {
  comment_on_entry: PrefValue;
  favorite_updated: PrefValue;
  webhook_failed: PrefValue;
}

const PREF_KEYS: { key: keyof Prefs; icon: string }[] = [
  { key: "comment_on_entry", icon: "💬" },
  { key: "favorite_updated", icon: "⭐" },
  { key: "webhook_failed", icon: "🔗" },
];

export default function NotificationPrefsClient() {
  const t = useTranslations("NotificationPrefs");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/notifications").then(r => r.json()).then(d => setPrefs(d.prefs));
  }, []);

  async function update(key: keyof Prefs, value: PrefValue) {
    if (!prefs) return;
    setSaving(key);
    setPrefs({ ...prefs, [key]: value });
    await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSaving(null);
  }

  const optionStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: "var(--radius-md)",
    border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
    background: active ? "rgba(var(--accent-rgb, 99,102,241), 0.15)" : "var(--background)",
    color: active ? "var(--accent)" : "var(--text-dim)",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s",
    userSelect: "none" as const,
  });

  return (
    <>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>{t("title")}</h2>
      <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", marginBottom: 24 }}>{t("description")}</p>

      {!prefs ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {PREF_KEYS.map(({ key, icon }) => (
            <div
              key={key}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t(`${key}.label`)}</span>
                {saving === key && <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>saving...</span>}
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: 12 }}>
                {t(`${key}.description`)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["all", "inapp", "off"] as PrefValue[]).map((val) => (
                  <div
                    key={val}
                    onClick={() => update(key, val)}
                    style={optionStyle(prefs[key] === val)}
                  >
                    {t(`option.${val}`)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
