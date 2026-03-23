"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, X } from "lucide-react";

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
const ALL_SCOPES = ["global", "own", "collection", "entry"] as const;

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  own: "Own entries",
  collection: "Collection",
  entry: "Entry",
};

const ACTION_LABELS: Record<string, string> = {
  read: "Read",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  manage_settings: "Manage Settings",
  manage_users: "Manage Users",
};

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

const selectStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "6px 10px",
  fontSize: "0.82rem",
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

const btnSmall: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text-secondary)",
  borderRadius: "var(--radius-md)",
  padding: "5px 10px",
  cursor: "pointer",
  fontSize: "0.78rem",
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

const permBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "4px 10px",
  fontSize: "0.8rem",
  color: "var(--text)",
};

export default function RolesClient() {
  const t = useTranslations("Roles");
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [message, setMessage] = useState("");
  const [addingPermFor, setAddingPermFor] = useState<number | null>(null);
  const [newPermAction, setNewPermAction] = useState<string>(ALL_ACTIONS[0]);
  const [newPermScope, setNewPermScope] = useState<string>("global");

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
      flash(t("createRole") + " ✓");
    } else {
      const data = await res.json();
      flash(data.error || "Error");
    }
  }

  async function deleteRole(roleId: number) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
    if (res.ok) {
      load();
      flash(t("deleteRole") + " ✓");
    } else {
      const data = await res.json();
      flash(data.error || "Error");
    }
  }

  async function addPermission(roleId: number) {
    const res = await fetch(`/api/roles/${roleId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: newPermAction, scope: newPermScope }),
    });
    if (res.ok) {
      setAddingPermFor(null);
      load();
    } else {
      const data = await res.json();
      flash(data.error || "Error");
    }
  }

  async function removePermission(roleId: number, action: string, scope: string) {
    await fetch(`/api/roles/${roleId}/permissions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, scope }),
    });
    load();
  }

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
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

  const scopeLabel = (scope: string) => SCOPE_LABELS[scope] || scope;

  const scopeColor = (scope: string) => {
    switch (scope) {
      case "global": return "var(--accent)";
      case "own": return "#f59e0b";
      case "collection": return "#8b5cf6";
      case "entry": return "#06b6d4";
      default: return "var(--text-secondary)";
    }
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
                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", margin: "4px 0 0" }}>
                  {role.userCount} {t("usersWithRole")} · {role.groupCount || 0} groups
                </p>
              </div>
              {!role.builtIn && (
                <button onClick={() => deleteRole(role.id)} style={btnDanger}>{t("deleteRole")}</button>
              )}
            </div>

            {/* Permission list with scope badges */}
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{t("permissions")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {role.permissions.map((p) => (
                <span key={p.id} style={permBadge}>
                  <span style={{ fontWeight: 500 }}>{actionLabel(p.action)}</span>
                  <span style={{ fontSize: "0.7rem", color: scopeColor(p.scope), fontWeight: 600 }}>
                    {scopeLabel(p.scope)}
                  </span>
                  <button
                    onClick={() => removePermission(role.id, p.action, p.scope)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-dim)", display: "flex" }}
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {role.permissions.length === 0 && (
                <span style={{ color: "var(--text-dim)", fontSize: "0.82rem", fontStyle: "italic" }}>No permissions</span>
              )}
            </div>

            {/* Add permission row */}
            {addingPermFor === role.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={newPermAction} onChange={(e) => setNewPermAction(e.target.value)} style={selectStyle}>
                  {ALL_ACTIONS.map((a) => (
                    <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                  ))}
                </select>
                <select value={newPermScope} onChange={(e) => setNewPermScope(e.target.value)} style={selectStyle}>
                  {ALL_SCOPES.map((s) => (
                    <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
                  ))}
                </select>
                <button onClick={() => addPermission(role.id)} style={{ ...btnSmall, background: "var(--accent)", color: "var(--accent-contrast)", border: "none" }}>
                  Add
                </button>
                <button onClick={() => setAddingPermFor(null)} style={btnSmall}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => { setAddingPermFor(role.id); setNewPermAction(ALL_ACTIONS[0]); setNewPermScope("global"); }} style={btnSmall}>
                <Plus size={14} /> Add Permission
              </button>
            )}
          </div>
        ))}
        {roles.length === 0 && <p style={{ color: "var(--text-dim)" }}>{t("noRoles")}</p>}
      </div>

      {message && <div style={{ color: "var(--accent)", fontSize: "0.85rem", marginTop: 8 }}>{message}</div>}
    </div>
  );
}
