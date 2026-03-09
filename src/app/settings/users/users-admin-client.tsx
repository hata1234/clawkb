"use client";

import { useEffect, useState } from "react";

type AppRole = "admin" | "editor" | "viewer";

interface RoleGroup {
  id: number;
  name: string;
  description: string | null;
  role: AppRole;
  userCount: number;
}

interface UserRecord {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  role: AppRole;
  effectiveRole: AppRole;
  approvalStatus: string;
  avatarUrl: string | null;
  group: { id: number; name: string; role: AppRole } | null;
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
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
};

const roles: AppRole[] = ["admin", "editor", "viewer"];

export default function UsersAdminClient() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [message, setMessage] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", displayName: "", password: "", role: "viewer" as AppRole, groupId: "" });
  const [newGroup, setNewGroup] = useState({ name: "", description: "", role: "viewer" as AppRole });

  async function load() {
    const [usersRes, groupsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/role-groups"),
    ]);
    const usersData = await usersRes.json();
    const groupsData = await groupsRes.json();
    setUsers(usersData.users || []);
    setGroups(groupsData.groups || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateUser(userId: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((current) => current.map((user) => user.id === userId ? data.user : user));
      setMessage("User updated.");
    } else {
      setMessage(data.error || "Failed to update user");
    }
  }

  async function createUser() {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newUser,
        groupId: newUser.groupId ? Number(newUser.groupId) : null,
        approvalStatus: "approved",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((current) => [data.user, ...current]);
      setNewUser({ username: "", email: "", displayName: "", password: "", role: "viewer", groupId: "" });
      setMessage("User created.");
    } else {
      setMessage(data.error || "Failed to create user");
    }
  }

  async function createGroup() {
    const res = await fetch("/api/role-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGroup),
    });
    const data = await res.json();
    if (res.ok) {
      setGroups((current) => [...current, data.group].sort((a, b) => a.name.localeCompare(b.name)));
      setNewGroup({ name: "", description: "", role: "viewer" });
      setMessage("Group created.");
    } else {
      setMessage(data.error || "Failed to create group");
    }
  }

  async function deleteGroup(groupId: number) {
    const res = await fetch(`/api/role-groups/${groupId}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setGroups((current) => current.filter((group) => group.id !== groupId));
      setMessage("Group removed.");
    } else {
      setMessage(data.error || "Failed to remove group");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>Create User</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <input value={newUser.username} onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))} placeholder="Username" style={inputStyle} />
          <input value={newUser.displayName} onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))} placeholder="Display name" style={inputStyle} />
          <input value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} placeholder="Email" style={inputStyle} />
          <input type="password" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} placeholder="Password" style={inputStyle} />
          <select value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as AppRole }))} style={inputStyle}>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select value={newUser.groupId} onChange={(event) => setNewUser((current) => ({ ...current, groupId: event.target.value }))} style={inputStyle}>
            <option value="">No group</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
        <button onClick={createUser} style={{ marginTop: 12, border: "none", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--accent-contrast)", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>
          Create user
        </button>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>Role Groups</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <input value={newGroup.name} onChange={(event) => setNewGroup((current) => ({ ...current, name: event.target.value }))} placeholder="Group name" style={inputStyle} />
          <input value={newGroup.description} onChange={(event) => setNewGroup((current) => ({ ...current, description: event.target.value }))} placeholder="Description" style={inputStyle} />
          <select value={newGroup.role} onChange={(event) => setNewGroup((current) => ({ ...current, role: event.target.value as AppRole }))} style={inputStyle}>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <button onClick={createGroup} style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--background)", color: "var(--text)", padding: "10px 16px", cursor: "pointer" }}>
          Create group
        </button>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {groups.map((group) => (
            <div key={group.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
              <div>
                <div style={{ color: "var(--text)" }}>{group.name}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: 4 }}>{group.role} · {group.userCount} users</div>
              </div>
              <button onClick={() => deleteGroup(group.id)} style={{ border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.08)", color: "var(--danger)", borderRadius: "var(--radius-md)", padding: "8px 10px", cursor: "pointer" }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>Users</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {users.map((user) => (
            <div key={user.id} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>{user.displayName}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: 4 }}>
                    @{user.username}{user.email ? ` · ${user.email}` : ""}{user.agent ? " · agent" : ""}
                  </div>
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                  {user.approvalStatus} · effective {user.effectiveRole}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })} style={inputStyle}>
                  {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <select value={user.group?.id || ""} onChange={(event) => updateUser(user.id, { groupId: event.target.value ? Number(event.target.value) : null })} style={inputStyle}>
                  <option value="">No group</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
                <select value={user.approvalStatus} onChange={(event) => updateUser(user.id, { approvalStatus: event.target.value })} style={inputStyle}>
                  <option value="approved">approved</option>
                  <option value="pending_approval">pending_approval</option>
                  <option value="pending_verification">pending_verification</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message ? <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div> : null}
    </div>
  );
}
