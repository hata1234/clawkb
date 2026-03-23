"use client";

import TemplateManager from "@/components/TemplateManager";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface PluginRecord {
  id: string;
  name: string;
  version: string;
  description?: string;
  builtIn?: boolean;
  hooks?: string[];
  permissions?: string[];
  enabled: boolean;
  apiBasePath?: string;
}

interface SettingsPanel {
  id: string;
  title: string;
  description?: string;
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)",
  padding: 20,
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

export default function PluginsAdminClient() {
  const t = useTranslations("Plugins");
  const tc = useTranslations("Common");
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [panels, setPanels] = useState<SettingsPanel[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    hooks: "entry.beforeCreate,entry.afterCreate",
  });

  async function load() {
    const res = await fetch("/api/plugins");
    const data = await res.json();
    setPlugins(data.plugins || []);
    setPanels(data.panels || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePlugin(pluginId: string, enabled: boolean) {
    const res = await fetch("/api/plugins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pluginId, enabled }),
    });
    const data = await res.json();
    if (res.ok) {
      setPlugins((current) => current.map((plugin) => (plugin.id === pluginId ? { ...plugin, enabled } : plugin)));
      setMessage(t("pluginStateUpdated"));
    } else {
      setMessage(data.error || t("failedToUpdatePlugin"));
    }
  }

  async function install() {
    const res = await fetch("/api/plugins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        hooks: form.hooks
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setForm({ id: "", name: "", description: "", hooks: "entry.beforeCreate,entry.afterCreate" });
      await load();
      setMessage(t("pluginSkeletonInstalled"));
    } else {
      setMessage(data.error || t("failedToInstallPlugin"));
    }
  }

  async function remove(pluginId: string) {
    const res = await fetch("/api/plugins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pluginId }),
    });
    const data = await res.json();
    if (res.ok) {
      setPlugins((current) => current.filter((plugin) => plugin.id !== pluginId));
      setMessage(t("pluginRemoved"));
    } else {
      setMessage(data.error || t("failedToRemovePlugin"));
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>{t("installNewPluginSkeleton")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <input
            value={form.id}
            onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
            placeholder={t("pluginIdPlaceholder")}
            style={inputStyle}
          />
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={t("pluginNamePlaceholder")}
            style={inputStyle}
          />
          <input
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder={tc("description")}
            style={inputStyle}
          />
          <input
            value={form.hooks}
            onChange={(event) => setForm((current) => ({ ...current, hooks: event.target.value }))}
            placeholder={t("hooksPlaceholder")}
            style={inputStyle}
          />
        </div>
        <button
          onClick={install}
          style={{
            marginTop: 12,
            border: "none",
            borderRadius: "var(--radius-md)",
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            padding: "10px 16px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t("installSkeleton")}
        </button>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>{t("installedPlugins")}</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>{plugin.name}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: 4 }}>
                    {plugin.id} · v{plugin.version}
                    {plugin.builtIn ? ` · ${t("builtIn")}` : ""}
                  </div>
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={plugin.enabled}
                    onChange={(event) => togglePlugin(plugin.id, event.target.checked)}
                  />
                  {t("enabled")}
                </label>
              </div>
              {plugin.description ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {plugin.description}
                </p>
              ) : null}
              <div style={{ marginTop: 10, fontSize: "0.78rem", color: "var(--text-dim)" }}>
                {t("hooks")}: {(plugin.hooks || []).join(", ") || t("none")}
              </div>
              {plugin.apiBasePath ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: "0.78rem",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {t("apiBase")}: {plugin.apiBasePath}
                </div>
              ) : null}
              {!plugin.builtIn ? (
                <button
                  onClick={() => remove(plugin.id)}
                  style={{
                    marginTop: 12,
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(248,113,113,0.08)",
                    color: "var(--danger)",
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  {tc("remove")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {panels.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>{t("pluginSettings")}</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {panels.map((panel) => (
              <div
                key={panel.id}
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px 18px",
                }}
              >
                <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>{panel.title}</div>
                {panel.description ? (
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginBottom: 12 }}>
                    {panel.description}
                  </div>
                ) : null}
                {panel.id === "entry-templates" && <TemplateManager />}
              </div>
            ))}
          </div>
        </div>
      )}

      {message ? <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div> : null}
    </div>
  );
}
