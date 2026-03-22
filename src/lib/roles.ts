// roles.ts — unified ACL helpers
// Effective role resolution: User.directRole (via roleId) ?? User.group.role ?? Viewer

export type AppRole = "admin" | "editor" | "viewer";

export interface RoleBearing {
  roleId?: number | null;
  directRole?: { id: number; name: string; permissions: PermissionLike[] } | null;
  group?: { roleId?: number | null; role?: { id: number; name: string; permissions: PermissionLike[] } | null } | null;
  approvalStatus?: string | null;
  // Legacy compat: old code may still pass role string
  role?: string | null;
}

export interface PermissionLike {
  action: string;
  scope: string;
  scopeId?: number | null;
}

export function isApproved(subject: { approvalStatus?: string | null }) {
  return (subject.approvalStatus ?? "approved") === "approved";
}

/**
 * Get the effective role name string for display purposes.
 * Resolution: User.directRole.name ?? User.group.role.name ?? "viewer"
 */
export function getEffectiveRoleName(subject: RoleBearing): string {
  if (subject.directRole?.name) {
    const n = subject.directRole.name.toLowerCase();
    if (n === "administrators") return "admin";
    if (n === "editors") return "editor";
    if (n === "viewers") return "viewer";
    return n;
  }
  if (subject.group?.role?.name) {
    const n = subject.group.role.name.toLowerCase();
    if (n === "administrators") return "admin";
    if (n === "editors") return "editor";
    if (n === "viewers") return "viewer";
    return n;
  }
  // fallback to legacy role string if present
  return normalizeRole(subject.role);
}

/**
 * Get effective permissions list for a user.
 * Resolution: User.directRole.permissions ?? User.group.role.permissions ?? []
 */
export function getEffectivePermissions(subject: RoleBearing): PermissionLike[] {
  if (subject.directRole?.permissions && subject.directRole.permissions.length > 0) {
    return subject.directRole.permissions;
  }
  if (subject.group?.role?.permissions && subject.group.role.permissions.length > 0) {
    return subject.group.role.permissions;
  }
  return [];
}

// ---- Legacy compat helpers ----

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "admin" || role === "editor" || role === "viewer") return role;
  return "viewer";
}

/** @deprecated Use getEffectiveRoleName instead */
export function getEffectiveRole(subject: RoleBearing): AppRole {
  return normalizeRole(getEffectiveRoleName(subject));
}

export function hasRole(role: AppRole, expected: AppRole) {
  const ROLE_RANK: Record<AppRole, number> = { viewer: 0, editor: 1, admin: 2 };
  return ROLE_RANK[role] >= ROLE_RANK[expected];
}
