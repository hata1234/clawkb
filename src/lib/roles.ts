// roles.ts — simplified ACL helpers (post-refactor)
// Only kept for legacy compat in a few places

export type AppRole = "admin" | "approver" | "reviewer" | "editor" | "viewer";

export const ROLE_RANK: Record<AppRole, number> = { viewer: 0, editor: 1, reviewer: 2, approver: 3, admin: 4 };

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "admin" || role === "approver" || role === "reviewer" || role === "editor" || role === "viewer")
    return role;
  return "viewer";
}

export function hasRole(role: AppRole, expected: AppRole) {
  return ROLE_RANK[role] >= ROLE_RANK[expected];
}
