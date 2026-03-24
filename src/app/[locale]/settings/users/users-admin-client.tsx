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

interface DeleteDialogState {
  open: boolean;
  user: UserRecord | null;
  entryCount: number;
  commentCount: number;
  action: "transfer" | "delete";
  transferToId: number | null;
  loading: boolean;
}

export default function UsersAdminClient() {
  const t = useTranslations("Users");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [message, setMessage] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", displayName: "", password: "", isAdmin: false });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    user: null,
    entryCount: 0,
    commentCount: 0,
    action: "transfer",
    transferToId: null,
    loading: false,
  });

  async function load() {
    const [usersRes, groupsRes] = await Promise.all([fetch("/api/users"), fetch("/api/groups")]);
    const usersData = await usersRes.json();
    const groupsData = await groupsRes.json();
    setUsers(usersData.users || []);
    setGroups((groupsData.groups || []).map((g: GroupOption) => ({ id: g.id, name: g.name, builtIn: g.builtIn })));
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
      setUsers((current) => current.map((user) => (user.id === userId ? data.user : user)));
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

  async function openDeleteDialog(user: UserRecord) {
    try {
      const res = await fetch(`/api/users/${user.id}`);
      const data = await res.json();
      setDeleteDialog({
        open: true,
        user,
        entryCount: data.stats?.entryCount || 0,
        commentCount: data.stats?.commentCount || 0,
        action: "transfer",
        transferToId: null,
        loading: false,
      });
    } catch (err) {
      setMessage(t("userDeleteFailed"));
    }
  }

  async function confirmDelete() {
    if (!deleteDialog.user) return;
    const { user, action, transferToId, entryCount } = deleteDialog;

    if (entryCount > 0 && action === "transfer" && !transferToId) {
      setMessage(t("selectTransferTarget"));
      return;
    }

    setDeleteDialog((d) => ({ ...d, loading: true }));
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryAction: entryCount > 0 ? action : "transfer", transferToId }),
      });
      if (res.ok) {
        setUsers((current) => current.filter((u) => u.id !== user.id));
        setMessage(t("userDeleted"));
        setDeleteDialog((d) => ({ ...d, open: false, user: null }));
      } else {
        const data = await res.json();
        setMessage(data.error || t("userDeleteFailed"));
      }
    } catch (err) {
      setMessage(t("userDeleteFailed"));
    } finally {
      setDeleteDialog((d) => ({ ...d, loading: false }));
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>{t("createUser")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <input
            value={newUser.username}
            onChange={(e) => setNewUser((c) => ({ ...c, username: e.target.value }))}
            placeholder={t("username")}
            style={inputStyle}
          />
          <input
            value={newUser.displayName}
            onChange={(e) => setNewUser((c) => ({ ...c, displayName: e.target.value }))}
            placeholder={t("displayName")}
            style={inputStyle}
          />
          <input
            value={newUser.email}
            onChange={(e) => setNewUser((c) => ({ ...c, email: e.target.value }))}
            placeholder={t("email")}
            style={inputStyle}
          />
          <input
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser((c) => ({ ...c, password: e.target.value }))}
            placeholder={t("password")}
            style={inputStyle}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
            }}
          >
            <input
              type="checkbox"
              checked={newUser.isAdmin}
              onChange={(e) => setNewUser((c) => ({ ...c, isAdmin: e.target.checked }))}
            />
            Admin
          </label>
        </div>
        <button
          onClick={createUser}
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
          {t("createUser")}
        </button>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>{t("usersTitle")}</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {users.map((user) => (
            <div
              key={user.id}
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
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ color: "var(--text)", fontWeight: 600 }}>{user.displayName}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: 4 }}>
                    @{user.username}
                    {user.email ? ` · ${user.email}` : ""}
                    {user.agent ? ` · ${t("agent")}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "right" }}>
                    <div>{user.approvalStatus}</div>
                    {user.isAdmin && (
                      <div style={{ marginTop: 2, color: "var(--accent)", fontWeight: 600 }}>Admin</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openDeleteDialog(user)}
                    title={t("deleteUser")}
                    style={{
                      background: "none",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--danger, #ef4444)",
                      cursor: "pointer",
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("deleteUser")}
                  </button>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>Admin</div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      height: 42,
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
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
                    {groups.map((g) => {
                      const inGroup = user.groups.some((ug) => ug.id === g.id);
                      const isBuiltIn = g.builtIn;
                      if (isBuiltIn) {
                        return (
                          <span
                            key={g.id}
                            style={{
                              padding: "2px 8px",
                              fontSize: "0.72rem",
                              borderRadius: 999,
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
                            const builtInIds = groups.filter((bg) => bg.builtIn).map((bg) => bg.id);
                            const newGroupIds = inGroup
                              ? user.groups.filter((ug) => ug.id !== g.id).map((ug) => ug.id)
                              : [...user.groups.map((ug) => ug.id), g.id];
                            // Always include built-in group IDs
                            const finalIds = [...new Set([...builtInIds, ...newGroupIds])];
                            updateUser(user.id, { groupIds: finalIds });
                          }}
                          style={{
                            padding: "2px 8px",
                            fontSize: "0.72rem",
                            borderRadius: 999,
                            background: inGroup ? "var(--accent)" : "var(--surface-hover)",
                            color: inGroup ? "var(--accent-contrast)" : "var(--text-secondary)",
                            border: `1px solid ${inGroup ? "var(--accent)" : "var(--border)"}`,
                            cursor: "pointer",
                          }}
                        >
                          {inGroup ? "✓ " : ""}
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 2 }}>
                    {t("approvalStatus")}
                  </div>
                  <select
                    value={user.approvalStatus}
                    onChange={(e) => updateUser(user.id, { approvalStatus: e.target.value })}
                    style={inputStyle}
                  >
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

      {/* Delete User Dialog */}
      {deleteDialog.open && deleteDialog.user && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setDeleteDialog((d) => ({ ...d, open: false }))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              padding: 28,
              width: "100%",
              maxWidth: 460,
              margin: 16,
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16, color: "var(--text)" }}>
              {t("deleteUser")}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 12 }}>
              {t("deleteUserConfirm", { name: deleteDialog.user.displayName || deleteDialog.user.username })}
            </p>

            {deleteDialog.entryCount > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--warning, #f59e0b)",
                    marginBottom: 12,
                    padding: "8px 12px",
                    background: "rgba(245,158,11,0.08)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}
                >
                  {t("userHasEntries", {
                    count: deleteDialog.entryCount,
                    comments: deleteDialog.commentCount,
                  })}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.85rem",
                      color: "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="deleteAction"
                      checked={deleteDialog.action === "transfer"}
                      onChange={() => setDeleteDialog((d) => ({ ...d, action: "transfer" }))}
                    />
                    {t("transferEntries")}
                  </label>

                  {deleteDialog.action === "transfer" && (
                    <select
                      value={deleteDialog.transferToId || ""}
                      onChange={(e) =>
                        setDeleteDialog((d) => ({ ...d, transferToId: e.target.value ? Number(e.target.value) : null }))
                      }
                      style={{ ...inputStyle, marginLeft: 24, width: "calc(100% - 24px)" }}
                    >
                      <option value="">{t("selectTransferTarget")}</option>
                      {users
                        .filter((u) => u.id !== deleteDialog.user!.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName || u.username} (@{u.username})
                          </option>
                        ))}
                    </select>
                  )}

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.85rem",
                      color: "var(--danger, #ef4444)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="deleteAction"
                      checked={deleteDialog.action === "delete"}
                      onChange={() => setDeleteDialog((d) => ({ ...d, action: "delete" }))}
                    />
                    {t("deleteEntries")}
                  </label>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>{t("noEntries")}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setDeleteDialog((d) => ({ ...d, open: false }))}
                style={{
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-hover)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={confirmDelete}
                disabled={
                  deleteDialog.loading ||
                  (deleteDialog.entryCount > 0 && deleteDialog.action === "transfer" && !deleteDialog.transferToId)
                }
                style={{
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--danger, #ef4444)",
                  color: "#fff",
                  cursor: deleteDialog.loading ? "not-allowed" : "pointer",
                  opacity: deleteDialog.loading ? 0.6 : 1,
                  fontWeight: 600,
                }}
              >
                {deleteDialog.loading ? "..." : t("deleteUser")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
