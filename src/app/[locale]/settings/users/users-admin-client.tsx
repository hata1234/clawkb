"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface GroupOption {
  id: number;
  name: string;
  builtIn: boolean;
}

interface UserRecord {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  isAdmin: boolean;
  groups: GroupOption[];
  approvalStatus: string;
  avatarUrl: string | null;
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
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [message, setMessage] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", displayName: "", password: "", isAdmin: false });

  async function load() {
    const [usersRes, groupsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/groups"),
    ]);
    const usersData = await usersRes.json();
    const groupsData = await groupsRes.json();
    setUsers(usersData.users || []);
    setGroups((groupsData.groups || []).map((g: GroupOption) => ({ id: g.id, name: g.name, builtIn: g.builtIn })));
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
        approvalStatus: "approved",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((current) => [data.user, ...current]);
      setNewUser({ username: "", email: "", displayName: "", password: "", isAdmin: false });
      setMessage(t("userCreated"));
    } else {
      setMessage(data.error || t("userCreateFailed"));
    }
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
          <label style={{ display: "flex", alignItems: "center", gap: 8, height: 42, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={newUser.isAdmin} onChange={(e) => setNewUser((c) => ({ ...c, isAdmin: e.target.checked }))} />
            Admin
          </label>
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
                  {user.isAdmin && <div style={{ marginTop: 2, color: "var(--accent)", fontWeight: 600 }}>Admin</div>}
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
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>Admin</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, height: 42, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={user.isAdmin}
                      onChange={(e) => updateUser(user.id, { isAdmin: e.target.checked })}
                    />
                    System Admin
                  </label>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>Groups</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minHeight: 42, alignItems: "center" }}>
                    {groups.map(g => {
                      const inGroup = user.groups.some(ug => ug.id === g.id);
                      const isBuiltIn = g.builtIn;
                      if (isBuiltIn) {
                        return (
                          <span
                            key={g.id}
                            style={{
                              padding: "2px 8px", fontSize: "0.72rem", borderRadius: 999,
                              background: "var(--accent)",
                              color: "var(--accent-contrast)",
                              border: "1px solid var(--accent)",
                              opacity: 0.7,
                              cursor: "default",
                            }}
                          >
                            ✓ {g.name}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            const builtInIds = groups.filter(bg => bg.builtIn).map(bg => bg.id);
                            const newGroupIds = inGroup
                              ? user.groups.filter(ug => ug.id !== g.id).map(ug => ug.id)
                              : [...user.groups.map(ug => ug.id), g.id];
                            // Always include built-in group IDs
                            const finalIds = [...new Set([...builtInIds, ...newGroupIds])];
                            updateUser(user.id, { groupIds: finalIds });
                          }}
                          style={{
                            padding: "2px 8px", fontSize: "0.72rem", borderRadius: 999,
                            background: inGroup ? "var(--accent)" : "var(--surface-hover)",
                            color: inGroup ? "var(--accent-contrast)" : "var(--text-secondary)",
                            border: `1px solid ${inGroup ? "var(--accent)" : "var(--border)"}`,
                            cursor: "pointer",
                          }}
                        >
                          {inGroup ? "✓ " : ""}{g.name}
                        </button>
                      );
                    })}
                  </div>
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
