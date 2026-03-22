"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface RoleOption {
  id: number;
  name: string;
}

interface GroupRecord {
  id: number;
  name: string;
  description: string | null;
  roleId: number | null;
  role: RoleOption | null;
  memberCount: number;
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

export default function GroupsClient() {
  const t = useTranslations("Groups");
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [gRes, rRes] = await Promise.all([fetch("/api/groups"), fetch("/api/roles")]);
    const gData = await gRes.json();
    const rData = await rRes.json();
    setGroups(gData.groups || []);
    setRoles((rData.roles || []).map((r: RoleOption) => ({ id: r.id, name: r.name })));
  }

  useEffect(() => { load(); }, []);

  async function createGroup() {
    if (!newName.trim()) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, roleId: newRoleId ? Number(newRoleId) : null }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      setNewRoleId("");
      load();
      setMessage(t("createGroup") + " ✓");
    } else {
      const data = await res.json();
      setMessage(data.error || "Error");
    }
  }

  async function updateGroupRole(groupId: number, roleId: string) {
    await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: roleId ? Number(roleId) : null }),
    });
    load();
  }

  async function deleteGroup(groupId: number) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) {
      load();
      setMessage(t("deleteGroup") + " ✓");
    } else {
      const data = await res.json();
      setMessage(data.error || "Error");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 4 }}>{t("title")}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>{t("description")}</p>
      </div>

      {/* Create new group */}
      <div style={card}>
        <h3 style={{ fontSize: "0.95rem", marginBottom: 12 }}>{t("createGroup")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("groupName")} style={inputStyle} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t("groupDescription")} style={inputStyle} />
          <select value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} style={inputStyle}>
            <option value="">{t("noRole")}</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button onClick={createGroup} style={{ ...btnPrimary, marginTop: 12 }}>{t("createGroup")}</button>
      </div>

      {/* Group cards */}
      <div style={{ display: "grid", gap: 12 }}>
        {groups.map((group) => (
          <div key={group.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{group.name}</div>
              {group.description && <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "4px 0 0" }}>{group.description}</p>}
              <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", margin: "4px 0 0" }}>{group.memberCount} {t("memberCount")}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 4 }}>{t("defaultRole")}</div>
                <select
                  value={group.roleId || ""}
                  onChange={(e) => updateGroupRole(group.id, e.target.value)}
                  style={{ ...inputStyle, width: 160 }}
                >
                  <option value="">{t("noRole")}</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <button onClick={() => deleteGroup(group.id)} style={btnDanger}>{t("deleteGroup")}</button>
            </div>
          </div>
        ))}
        {groups.length === 0 && <p style={{ color: "var(--text-dim)" }}>{t("noGroups")}</p>}
      </div>

      {message && <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div>}
    </div>
  );
}
