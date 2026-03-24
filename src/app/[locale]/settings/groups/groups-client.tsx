"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface GroupCollectionRole {
  collectionId: number;
  collectionName: string;
  role: string;
}

interface GroupUser {
  id: number;
  username: string;
  displayName: string | null;
}

interface GroupRecord {
  id: number;
  name: string;
  description: string | null;
  builtIn: boolean;
  memberCount: number;
  users: GroupUser[];
  collectionRoles: GroupCollectionRole[];
  canCreateCollections: boolean;
  canUseRag: boolean;
  canExport: boolean;
  canManageWebhooks: boolean;
}

interface CollectionOption {
  id: number;
  name: string;
}

interface UserOption {
  id: number;
  username: string;
  displayName: string | null;
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

const ROLES = ["admin", "editor", "viewer"] as const;

export default function GroupsClient() {
  const t = useTranslations("Groups");
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [allCollections, setAllCollections] = useState<CollectionOption[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [message, setMessage] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUserIds, setEditUserIds] = useState<number[]>([]);
  const [editCollectionRoles, setEditCollectionRoles] = useState<{ collectionId: number; role: string }[]>([]);
  const [editCanCreateCollections, setEditCanCreateCollections] = useState(false);
  const [editCanUseRag, setEditCanUseRag] = useState(false);
  const [editCanExport, setEditCanExport] = useState(false);
  const [editCanManageWebhooks, setEditCanManageWebhooks] = useState(false);

  async function load() {
    const [gRes, uRes, cRes] = await Promise.all([
      fetch("/api/groups"),
      fetch("/api/users"),
      fetch("/api/collections"),
    ]);
    const gData = await gRes.json();
    const uData = await uRes.json();
    const cData = await cRes.json();
    setGroups(gData.groups || []);
    setAllUsers(
      (uData.users || []).map((u: UserOption) => ({ id: u.id, username: u.username, displayName: u.displayName })),
    );
    const flat = cData.flat || [];
    setAllCollections(flat.map((c: CollectionOption) => ({ id: c.id, name: c.name })));
  }

  useEffect(() => {
    load();
  }, []);

  async function createGroup() {
    if (!newName.trim()) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      load();
      setMessage(t("createGroup") + " ✓");
    } else {
      const data = await res.json();
      setMessage(data.error || t("error"));
    }
  }

  function startEdit(group: GroupRecord) {
    setEditingGroupId(group.id);
    setEditName(group.name);
    setEditDesc(group.description || "");
    setEditUserIds(group.users.map((u) => u.id));
    setEditCollectionRoles(group.collectionRoles.map((cr) => ({ collectionId: cr.collectionId, role: cr.role })));
    setEditCanCreateCollections(group.canCreateCollections);
    setEditCanUseRag(group.canUseRag);
    setEditCanExport(group.canExport);
    setEditCanManageWebhooks(group.canManageWebhooks);
  }

  async function saveEdit(group: GroupRecord) {
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDesc || null,
        userIds: group.name === "Everyone" ? undefined : editUserIds,
        collectionRoles: editCollectionRoles,
        canCreateCollections: editCanCreateCollections,
        canUseRag: editCanUseRag,
        canExport: editCanExport,
        canManageWebhooks: editCanManageWebhooks,
      }),
    });
    if (res.ok) {
      setEditingGroupId(null);
      load();
      setMessage(t("editGroup") + " ✓");
    } else {
      const data = await res.json();
      setMessage(data.error || t("error"));
    }
  }

  async function deleteGroup(groupId: number) {
    if (!confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) {
      load();
      setMessage(t("deleteGroup") + " ✓");
    } else {
      const data = await res.json();
      setMessage(data.error || t("error"));
    }
  }

  function toggleUser(userId: number) {
    setEditUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function setCollectionRole(collectionId: number, role: string) {
    if (role === "none") {
      setEditCollectionRoles((prev) => prev.filter((cr) => cr.collectionId !== collectionId));
    } else {
      setEditCollectionRoles((prev) => {
        const existing = prev.find((cr) => cr.collectionId === collectionId);
        if (existing) return prev.map((cr) => (cr.collectionId === collectionId ? { ...cr, role } : cr));
        return [...prev, { collectionId, role }];
      });
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("groupName")}
            style={inputStyle}
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={t("groupDescription")}
            style={inputStyle}
          />
        </div>
        <button onClick={createGroup} style={{ ...btnPrimary, marginTop: 12 }}>
          {t("createGroup")}
        </button>
      </div>

      {/* Group cards */}
      <div style={{ display: "grid", gap: 12 }}>
        {groups.map((group) => (
          <div key={group.id} style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>
                  {group.name}
                  {group.builtIn && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "0.7rem",
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {t("builtIn") || "Built-in"}
                    </span>
                  )}
                </div>
                {group.description && (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "4px 0 0" }}>
                    {group.description}
                  </p>
                )}
                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", margin: "4px 0 0" }}>
                  {group.memberCount} {t("memberCount")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {editingGroupId === group.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(group)}
                      style={{ ...btnPrimary, padding: "8px 12px", fontSize: "0.82rem" }}
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingGroupId(null)} style={{ ...btnDanger }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(group)}
                      style={{
                        ...btnPrimary,
                        padding: "8px 12px",
                        fontSize: "0.82rem",
                        background: "var(--surface-hover)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {t("editGroup")}
                    </button>
                    {!group.builtIn && (
                      <button onClick={() => deleteGroup(group.id)} style={btnDanger}>
                        {t("deleteGroup")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Edit form */}
            {editingGroupId === group.id && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "grid", gap: 16 }}>
                {/* Name / Description */}
                {!group.builtIn && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 4 }}>Name</div>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 4 }}>Description</div>
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                )}

                {/* Members (skip for Everyone) */}
                {group.name !== "Everyone" && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 8 }}>Members</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {allUsers.map((user) => {
                        const selected = editUserIds.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleUser(user.id)}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.78rem",
                              borderRadius: 999,
                              border: "1px solid",
                              background: selected ? "var(--accent)" : "var(--surface-hover)",
                              color: selected ? "var(--accent-contrast)" : "var(--text-secondary)",
                              borderColor: selected ? "var(--accent)" : "var(--border)",
                              cursor: "pointer",
                            }}
                          >
                            {selected ? "✓ " : ""}
                            {user.displayName || user.username}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Feature Permissions */}
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 8 }}>
                    {t("featurePermissions") || "Feature Permissions"}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {(
                      [
                        { key: "canCreateCollections" as const, label: t("canCreateCollections") || "Create Collections", value: editCanCreateCollections, setter: setEditCanCreateCollections },
                        { key: "canUseRag" as const, label: t("canUseRag") || "AI Chat (RAG)", value: editCanUseRag, setter: setEditCanUseRag },
                        { key: "canExport" as const, label: t("canExport") || "Export Entries", value: editCanExport, setter: setEditCanExport },
                        { key: "canManageWebhooks" as const, label: t("canManageWebhooks") || "Manage Webhooks", value: editCanManageWebhooks, setter: setEditCanManageWebhooks },
                      ] as Array<{ key: string; label: string; value: boolean; setter: (v: boolean) => void }>
                    ).map((perm) => (
                      <label key={perm.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <input
                          type="checkbox"
                          checked={perm.value}
                          onChange={(e) => perm.setter(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: "pointer" }}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Collection Roles */}
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 8 }}>
                    Collection Access
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {allCollections.map((col) => {
                      const existing = editCollectionRoles.find((cr) => cr.collectionId === col.id);
                      return (
                        <div key={col.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {col.name}
                          </span>
                          <select
                            value={existing?.role || "none"}
                            onChange={(e) => setCollectionRole(col.id, e.target.value)}
                            style={{ ...inputStyle, width: 130, padding: "6px 8px", fontSize: "0.8rem" }}
                          >
                            <option value="none">No access</option>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    {allCollections.length === 0 && (
                      <p style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>No collections yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Summary view (not editing) */}
            {editingGroupId !== group.id && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {group.collectionRoles.map((cr) => (
                  <span
                    key={cr.collectionId}
                    style={{
                      fontSize: "0.72rem",
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {cr.collectionName}: <strong>{cr.role}</strong>
                  </span>
                ))}
                {group.canCreateCollections && (
                  <span style={{ fontSize: "0.72rem", background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-muted)", padding: "2px 8px", borderRadius: 999 }}>
                    {t("canCreateCollections") || "Create Collections"}
                  </span>
                )}
                {group.canUseRag && (
                  <span style={{ fontSize: "0.72rem", background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-muted)", padding: "2px 8px", borderRadius: 999 }}>
                    {t("canUseRag") || "AI Chat"}
                  </span>
                )}
                {group.canExport && (
                  <span style={{ fontSize: "0.72rem", background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-muted)", padding: "2px 8px", borderRadius: 999 }}>
                    {t("canExport") || "Export"}
                  </span>
                )}
                {group.canManageWebhooks && (
                  <span style={{ fontSize: "0.72rem", background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid var(--accent-muted)", padding: "2px 8px", borderRadius: 999 }}>
                    {t("canManageWebhooks") || "Webhooks"}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && <p style={{ color: "var(--text-dim)" }}>{t("noGroups")}</p>}
      </div>

      {message && <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div>}
    </div>
  );
}
