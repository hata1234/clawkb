"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Users, Shield, X, ChevronDown, ChevronRight } from "lucide-react";

const ACTIONS = ["read", "create", "edit", "delete", "manage_settings", "manage_users"] as const;
const SCOPES = ["global", "own", "collection", "entry"] as const;

const ACTION_LABELS: Record<string, string> = {
  read: "Read",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  manage_settings: "Manage Settings",
  manage_users: "Manage Users",
};

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  own: "Own entries",
  collection: "Collection",
  entry: "Entry",
};

interface Permission {
  id: number;
  action: string;
  scope: string;
  scopeId: number | null;
}

interface GroupUser {
  id: number;
  user: { id: number; username: string; displayName: string | null; avatarUrl: string | null };
}

interface PermissionGroup {
  id: number;
  name: string;
  description: string | null;
  builtIn: boolean;
  permissions: Permission[];
  users: GroupUser[];
}

interface AllUser {
  id: number;
  username: string;
  displayName: string | null;
}

const btnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 14px", borderRadius: "var(--radius-md)",
  fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--text-secondary)", transition: "all 0.15s ease",
};

const inputStyle: React.CSSProperties = {
  background: "var(--background)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)", padding: "8px 12px",
  fontSize: "0.85rem", color: "var(--text)", outline: "none", width: "100%",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none" as const, WebkitAppearance: "none" as const,
};

export default function PermissionsClient() {
  const t = useTranslations('Permissions');
  const tc = useTranslations('Common');
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [addPermGroup, setAddPermGroup] = useState<number | null>(null);
  const [newPermAction, setNewPermAction] = useState(ACTIONS[0]);
  const [newPermScope, setNewPermScope] = useState(SCOPES[0]);
  const [addUserGroup, setAddUserGroup] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.ok ? r.json() : { users: [] })
      .then((data) => setAllUsers(data.users || []))
      .catch(() => {});
  }, []);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName, description: newGroupDesc || null }),
    });
    if (res.ok) {
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreateGroup(false);
      fetchGroups();
    }
  };

  const deleteGroup = async (groupId: number) => {
    if (!confirm(t('confirmDeleteGroup'))) return;
    await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    fetchGroups();
  };

  const addPermission = async (groupId: number) => {
    const res = await fetch(`/api/groups/${groupId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: newPermAction, scope: newPermScope }),
    });
    if (res.ok) {
      setAddPermGroup(null);
      fetchGroups();
    }
  };

  const removePermission = async (groupId: number, permId: number) => {
    await fetch(`/api/groups/${groupId}/permissions/${permId}`, { method: "DELETE" });
    fetchGroups();
  };

  const addUserToGroup = async (groupId: number) => {
    if (!selectedUserId) return;
    const res = await fetch(`/api/groups/${groupId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });
    if (res.ok) {
      setAddUserGroup(null);
      setSelectedUserId("");
      fetchGroups();
    }
  };

  const removeUserFromGroup = async (groupId: number, userId: number) => {
    await fetch(`/api/groups/${groupId}/users/${userId}`, { method: "DELETE" });
    fetchGroups();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem", fontWeight: 400, color: "var(--text)" }}>{t('permissionGroups')}</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
            {t('permissionGroupsDescription')}
          </p>
        </div>
        <button onClick={() => setShowCreateGroup(!showCreateGroup)} style={{ ...btnStyle, background: "var(--accent)", color: "var(--accent-contrast)", border: "none" }}>
          <Plus style={{ width: 14, height: 14 }} /> {t('newGroup')}
        </button>
      </div>

      {showCreateGroup && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 4 }}>{t('groupName')}</label>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder={t('groupNamePlaceholder')} style={inputStyle} />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 4 }}>{tc('description')}</label>
            <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder={t('optionalDescription')} style={inputStyle} />
          </div>
          <button onClick={createGroup} style={{ ...btnStyle, background: "var(--accent)", color: "var(--accent-contrast)", border: "none" }}>{tc('create')}</button>
          <button onClick={() => setShowCreateGroup(false)} style={btnStyle}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const groupUserIds = new Set(group.users.map((u) => u.user.id));

          return (
            <div key={group.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              {/* Group header */}
              <div
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer" }}
              >
                {isExpanded ? <ChevronDown style={{ width: 16, height: 16, color: "var(--text-dim)" }} /> : <ChevronRight style={{ width: 16, height: 16, color: "var(--text-dim)" }} />}
                <Shield style={{ width: 16, height: 16, color: group.builtIn ? "var(--accent)" : "var(--text-muted)" }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text)" }}>{group.name}</span>
                  {group.builtIn && <span style={{ fontSize: "0.65rem", background: "var(--accent-muted)", color: "var(--accent)", padding: "1px 6px", borderRadius: 999, marginLeft: 8, fontWeight: 600 }}>{t('builtIn')}</span>}
                  {group.description && <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginLeft: 10 }}>{group.description}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  <span>{group.permissions.length} {t('permissions')}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Users style={{ width: 12, height: 12 }} /> {group.users.length}</span>
                </div>
                {!group.builtIn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                    style={{ ...btnStyle, padding: "4px 8px", border: "1px solid rgba(248,113,113,0.2)", color: "var(--danger)", background: "rgba(248,113,113,0.05)" }}
                    title={t('deleteGroup')}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Permissions */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h4 style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t('permissions')}</h4>
                      <button onClick={() => setAddPermGroup(addPermGroup === group.id ? null : group.id)} style={{ ...btnStyle, padding: "4px 10px", fontSize: "0.75rem" }}>
                        <Plus style={{ width: 12, height: 12 }} /> {tc('add')}
                      </button>
                    </div>

                    {addPermGroup === group.id && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                        <select value={newPermAction} onChange={(e) => setNewPermAction(e.target.value as typeof newPermAction)} style={{ ...selectStyle, width: "auto", minWidth: 150 }}>
                          {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
                        </select>
                        <select value={newPermScope} onChange={(e) => setNewPermScope(e.target.value as typeof newPermScope)} style={{ ...selectStyle, width: "auto", minWidth: 120 }}>
                          {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
                        </select>
                        <button onClick={() => addPermission(group.id)} style={{ ...btnStyle, background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "4px 12px", fontSize: "0.75rem" }}>{tc('add')}</button>
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {group.permissions.map((perm) => (
                        <span key={perm.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 10px", color: "var(--text-secondary)" }}>
                          <strong>{ACTION_LABELS[perm.action] || perm.action}</strong>
                          <span style={{ color: "var(--text-dim)" }}>({SCOPE_LABELS[perm.scope] || perm.scope}{perm.scopeId ? ` #${perm.scopeId}` : ""})</span>
                          <button
                            onClick={() => removePermission(group.id, perm.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-dim)" }}
                            title={t('removePermission')}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </span>
                      ))}
                      {group.permissions.length === 0 && <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{t('noPermissions')}</span>}
                    </div>
                  </div>

                  {/* Users */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h4 style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t('members')}</h4>
                      <button onClick={() => setAddUserGroup(addUserGroup === group.id ? null : group.id)} style={{ ...btnStyle, padding: "4px 10px", fontSize: "0.75rem" }}>
                        <Plus style={{ width: 12, height: 12 }} /> {t('addUser')}
                      </button>
                    </div>

                    {addUserGroup === group.id && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={{ ...selectStyle, width: "auto", minWidth: 200 }}>
                          <option value="">{t('selectUser')}</option>
                          {allUsers.filter((u) => !groupUserIds.has(u.id)).map((u) => (
                            <option key={u.id} value={u.id}>{u.displayName || u.username}</option>
                          ))}
                        </select>
                        <button onClick={() => addUserToGroup(group.id)} style={{ ...btnStyle, background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "4px 12px", fontSize: "0.75rem" }}>{tc('add')}</button>
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {group.users.map((ug) => (
                        <span key={ug.user.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 10px", color: "var(--text-secondary)" }}>
                          {ug.user.avatarUrl ? (
                            <img src={ug.user.avatarUrl} alt="" style={{ width: 16, height: 16, borderRadius: 999, objectFit: "cover" }} />
                          ) : (
                            <span style={{ width: 16, height: 16, borderRadius: 999, background: "var(--accent-muted)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 700 }}>
                              {(ug.user.displayName || ug.user.username).charAt(0).toUpperCase()}
                            </span>
                          )}
                          {ug.user.displayName || ug.user.username}
                          <button
                            onClick={() => removeUserFromGroup(group.id, ug.user.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-dim)" }}
                            title={t('removeFromGroup')}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </span>
                      ))}
                      {group.users.length === 0 && <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{t('noMembers')}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        select { color-scheme: dark; }
        input:focus, select:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 2px rgba(201,169,110,0.15); }
      `}</style>
    </div>
  );
}
