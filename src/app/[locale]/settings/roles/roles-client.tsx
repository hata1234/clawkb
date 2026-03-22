"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Permission {
  id: number;
  action: string;
  scope: string;
  scopeId: number | null;
}

interface RoleRecord {
  id: number;
  name: string;
  description: string | null;
  builtIn: boolean;
  permissions: Permission[];
  userCount: number;
  groupCount: number;
}

const ALL_ACTIONS = ["read", "create", "edit", "delete", "manage_settings", "manage_users"] as const;

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

const btnPrimary: React.CSSProperties = {
  border: "none",
  borderRadius: "var(--radius-md)",
  background: "var(--accent)",
  color: "var(--accent-contrast)",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnDanger: React.CSSProperties = {
  border: "1px solid rgba(248,113,113,0.2)",
  background: "rgba(248,113,113,0.08)",
  color: "var(--danger)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "0.82rem",
};

export default function RolesClient() {
  const t = useTranslations("Roles");
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/roles");
    const data = await res.json();
    setRoles(data.roles || []);
  }

  useEffect(() => { load(); }, []);

  async function createRole() {
    if (!newName.trim()) return;
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      load();
      setMessage(t("createRole") + " ✓");
    } else {
      const data = await res.json();
      setMessage(data.error || "Error");
    }
  }

  async function deleteRole(roleId: number) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
    if (res.ok) {
      load();
      setMessage(t("deleteRole") + " ✓");
    } else {
      const data = await res.json();
      setMessage(data.error || "Error");
    }
  }

  async function togglePermission(roleId: number, action: string, has: boolean) {
    if (has) {
      await fetch(`/api/roles/${roleId}/permissions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, scope: "global" }),
      });
    } else {
      await fetch(`/api/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, scope: "global" }),
      });
    }
    load();
  }

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      read: t("read"),
      create: t("create"),
      edit: t("edit"),
      delete: t("delete"),
      manage_settings: t("manageSettings"),
      manage_users: t("manageUsers"),
    };
    return map[action] || action;
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 4 }}>{t("title")}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>{t("description")}</p>
      </div>

      {/* Create new role */}
      <div style={card}>
        <h3 style={{ fontSize: "0.95rem", marginBottom: 12 }}>{t("createRole")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("roleName")} style={inputStyle} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t("roleDescription")} style={inputStyle} />
        </div>
        <button onClick={createRole} style={{ ...btnPrimary, marginTop: 12 }}>{t("createRole")}</button>
      </div>

      {/* Role cards */}
      <div style={{ display: "grid", gap: 16 }}>
        {roles.map((role) => (
          <div key={role.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{role.name}</span>
                  {role.builtIn && (
                    <span style={{ fontSize: "0.7rem", background: "var(--accent-muted)", color: "var(--accent)", padding: "2px 8px", borderRadius: 9999, fontWeight: 600 }}>
                      {t("builtIn")}
                    </span>
                  )}
                </div>
                {role.description && <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "4px 0 0" }}>{role.description}</p>}
                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", margin: "4px 0 0" }}>{role.userCount} {t("usersWithRole")}</p>
              </div>
              {!role.builtIn && (
                <button onClick={() => deleteRole(role.id)} style={btnDanger}>{t("deleteRole")}</button>
              )}
            </div>

            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{t("permissions")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {ALL_ACTIONS.map((action) => {
                const has = role.permissions.some((p) => p.action === action && p.scope === "global");
                return (
                  <label key={action} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem", color: "var(--text)" }}>
                    <input
                      type="checkbox"
                      checked={has}
                      onChange={() => togglePermission(role.id, action, has)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    {actionLabel(action)}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {roles.length === 0 && <p style={{ color: "var(--text-dim)" }}>{t("noRoles")}</p>}
      </div>

      {message && <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div>}
    </div>
  );
}
