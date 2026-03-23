"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_AUTH } from "@/lib/settings";

export default function AuthSettingsClient({ initialSettings }: { initialSettings: typeof DEFAULT_AUTH }) {
  const t = useTranslations("AuthSettings");
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");

  async function save(next: typeof DEFAULT_AUTH) {
    setSettings(next);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "auth", value: next }),
    });
    const data = await res.json();
    setMessage(res.ok ? t("authSettingsSaved") : data.error || t("failedToSaveSettings"));
  }

  function toggle<K extends keyof typeof DEFAULT_AUTH>(key: K) {
    void save({ ...settings, [key]: !settings[key] });
  }

  const labels: Record<string, string> = {
    allowRegistration: t("allowRegistration"),
    requireAdminApproval: t("requireAdminApproval"),
    requireEmailVerification: t("requireEmailVerification"),
    allowAgentRegistration: t("allowAgentRegistration"),
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: 24,
      }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {(
          ["allowRegistration", "requireAdminApproval", "requireEmailVerification", "allowAgentRegistration"] as const
        ).map((key) => (
          <label
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 14px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span style={{ color: "var(--text)" }}>{labels[key]}</span>
            <input
              type="checkbox"
              checked={settings[key as keyof typeof settings]}
              onChange={() => toggle(key as keyof typeof settings)}
            />
          </label>
        ))}
      </div>

      {message ? (
        <div
          style={{
            marginTop: 14,
            color: message === t("authSettingsSaved") ? "var(--accent)" : "var(--danger)",
            fontSize: "0.85rem",
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
