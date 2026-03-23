"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface RoleOption {
  id: number;
  name: string;
}

interface GroupOption {
  id: number;
  name: string;
  role: RoleOption | null;
}

interface UserRecord {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  role: string;
  roleId: number | null;
  directRole: RoleOption | null;
  effectiveRole: string;
  approvalStatus: string;
  avatarUrl: string | null;
  group: { id: number; name: string; role: RoleOption | null } | null;
  agent: boolean;
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)",
  padding: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "42px",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
};

export default function UsersAdminClient() {
  const t = useTranslations("Users");
  const tc = useTranslations("Common");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [message, setMessage] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", displayName: "", password: "", roleId: "", groupId: "" });

  async function load() {
    const [usersRes, rolesRes, groupsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/roles"),
      fetch("/api/groups"),
    ]);
    const usersData = await usersRes.json();
    const rolesData = await rolesRes.json();
    const groupsData = await groupsRes.json();
    setUsers(usersData.users || []);
    setRoles((rolesData.roles || []).map((r: RoleOption) => ({ id: r.id, name: r.name })));
    setGroups((groupsData.groups || []).map((g: GroupOption) => ({ id: g.id, name: g.name, role: g.role })));
  }

  useEffect(() => { load(); }, []);

  async function updateUser(userId: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((current) => current.map((user) => user.id === userId ? data.user : user));
      setMessage(t("userUpdated"));
    } else {
      setMessage(data.error || t("userUpdateFailed"));
    }
  }

  async function createUser() {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newUser,
        roleId: newUser.roleId ? Number(newUser.roleId) : undefined,
        groupId: newUser.groupId ? Number(newUser.groupId) : null,
        approvalStatus: "approved",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((current) => [data.user, ...current]);
      setNewUser({ username: "", email: "", displayName: "", password: "", roleId: "", groupId: "" });
      setMessage(t("userCreated"));
    } else {
      setMessage(data.error || t("userCreateFailed"));
    }
  }

  function getEffectiveRole(user: UserRecord): string {
    return user.directRole?.name?.toLowerCase() ?? user.group?.role?.name?.toLowerCase() ?? "viewer";
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>{t("createUser")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <input value={newUser.username} onChange={(e) => setNewUser((c) => ({ ...c, username: e.target.value }))} placeholder={t("username")} style={inputStyle} />
          <input value={newUser.displayName} onChange={(e) => setNewUser((c) => ({ ...c, displayName: e.target.value }))} placeholder={t("displayName")} style={inputStyle} />
          <input value={newUser.email} onChange={(e) => setNewUser((c) => ({ ...c, email: e.target.value }))} placeholder={t("email")} style={inputStyle} />
          <input type="password" value={newUser.password} onChange={(e) => setNewUser((c) => ({ ...c, password: e.target.value }))} placeholder={t("password")} style={inputStyle} />
          <select value={newUser.roleId} onChange={(e) => setNewUser((c) => ({ ...c, roleId: e.target.value }))} style={inputStyle}>
            <option value="">{t("inheritFromGroup")}</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={newUser.groupId} onChange={(e) => setNewUser((c) => ({ ...c, groupId: e.target.value }))} style={inputStyle}>
            <option value="">{t("noGroup")}</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <button onClick={createUser} style={{ marginTop: 12, border: "none", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--accent-contrast)", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>
          {t("createUser")}
        </button>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>{t("usersTitle")}</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {users.map((user) => (
            <div key={user.id} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>{user.displayName}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: 4 }}>
                    @{user.username}{user.email ? ` · ${user.email}` : ""}{user.agent ? ` · ${t("agent")}` : ""}
                  </div>
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "right" }}>
                  <div>{user.approvalStatus}</div>
                  <div style={{ marginTop: 2 }}>
                    {t("effectiveRole")}: <strong style={{ color: "var(--accent)" }}>{getEffectiveRole(user)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>{t("email")}</div>
                  <input
                    defaultValue={user.email || ""}
                    placeholder={t("email")}
                    style={inputStyle}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (user.email || "")) updateUser(user.id, { email: val || null });
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>{t("roleOverride")}</div>
                  <select
                    value={user.roleId || ""}
                    onChange={(e) => updateUser(user.id, { roleId: e.target.value ? Number(e.target.value) : null })}
                    style={inputStyle}
                  >
                    <option value="">{t("inheritFromGroup")}</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>{tc("all") === "All" ? "Group" : "群組"}</div>
                  <select
                    value={user.group?.id || ""}
                    onChange={(e) => updateUser(user.id, { groupId: e.target.value ? Number(e.target.value) : null })}
                    style={inputStyle}
                  >
                    <option value="">{t("noGroup")}</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>{t("approvalStatus")}</div>
                  <select value={user.approvalStatus} onChange={(e) => updateUser(user.id, { approvalStatus: e.target.value })} style={inputStyle}>
                    <option value="approved">{t("approved")}</option>
                    <option value="pending_approval">{t("pendingApproval")}</option>
                    <option value="pending_verification">{t("pendingVerification")}</option>
                    <option value="rejected">{t("rejected")}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div>}
    </div>
  );
}
