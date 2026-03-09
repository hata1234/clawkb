export type AppRole = "admin" | "editor" | "viewer";

export interface RoleBearing {
  role?: string | null;
  group?: { role?: string | null } | null;
  approvalStatus?: string | null;
}

const ROLE_RANK: Record<AppRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return "viewer";
}

export function getEffectiveRole(subject: RoleBearing): AppRole {
  const directRole = normalizeRole(subject.role);
  const groupRole = normalizeRole(subject.group?.role);
  return ROLE_RANK[directRole] >= ROLE_RANK[groupRole] ? directRole : groupRole;
}

export function isApproved(subject: { approvalStatus?: string | null }) {
  return (subject.approvalStatus ?? "approved") === "approved";
}

export function hasRole(role: AppRole, expected: AppRole) {
  return ROLE_RANK[role] >= ROLE_RANK[expected];
}
