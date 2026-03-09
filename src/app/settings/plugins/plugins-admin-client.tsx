"use client";

import { useEffect, useState } from "react";

interface PluginRecord {
  id: string;
  name: string;
  version: string;
  description?: string;
  builtIn?: boolean;
  hooks?: string[];
  permissions?: string[];
  enabled: boolean;
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
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [panels, setPanels] = useState<SettingsPanel[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ id: "", name: "", description: "", hooks: "entry.beforeCreate,entry.afterCreate" });

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
      setPlugins((current) => current.map((plugin) => plugin.id === pluginId ? { ...plugin, enabled } : plugin));
      setMessage("Plugin state updated.");
    } else {
      setMessage(data.error || "Failed to update plugin");
    }
  }

  async function install() {
    const res = await fetch("/api/plugins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        hooks: form.hooks.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setForm({ id: "", name: "", description: "", hooks: "entry.beforeCreate,entry.afterCreate" });
      await load();
      setMessage("Plugin skeleton installed.");
    } else {
      setMessage(data.error || "Failed to install plugin");
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
      setMessage("Plugin removed.");
    } else {
      setMessage(data.error || "Failed to remove plugin");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Install New Plugin Skeleton</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <input value={form.id} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="plugin-id" style={inputStyle} />
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Plugin name" style={inputStyle} />
          <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" style={inputStyle} />
          <input value={form.hooks} onChange={(event) => setForm((current) => ({ ...current, hooks: event.target.value }))} placeholder="Comma-separated hooks" style={inputStyle} />
        </div>
        <button onClick={install} style={{ marginTop: 12, border: "none", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--accent-contrast)", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>
          Install skeleton
        </button>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Installed Plugins</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {plugins.map((plugin) => (
            <div key={plugin.id} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>{plugin.name}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: 4 }}>{plugin.id} · v{plugin.version}{plugin.builtIn ? " · built-in" : ""}</div>
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={plugin.enabled} onChange={(event) => togglePlugin(plugin.id, event.target.checked)} />
                  Enabled
                </label>
              </div>
              {plugin.description ? <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>{plugin.description}</p> : null}
              <div style={{ marginTop: 10, fontSize: "0.78rem", color: "var(--text-dim)" }}>
                Hooks: {(plugin.hooks || []).join(", ") || "none"}
              </div>
              {!plugin.builtIn ? (
                <button onClick={() => remove(plugin.id)} style={{ marginTop: 12, border: "1px solid rgba(248,113,113,0.2)", borderRadius: "var(--radius-md)", background: "rgba(248,113,113,0.08)", color: "var(--danger)", padding: "8px 10px", cursor: "pointer" }}>
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Registered Settings Panels</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {panels.map((panel) => (
            <div key={panel.id} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
              <div style={{ color: "var(--text)" }}>{panel.title}</div>
              {panel.description ? <div style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginTop: 4 }}>{panel.description}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {message ? <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div> : null}
    </div>
  );
}
