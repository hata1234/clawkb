import { prisma } from "./prisma";

export type PermissionAction = "read" | "create" | "edit" | "delete" | "manage_settings" | "manage_users";
export type PermissionScope = "global" | "own" | "collection" | "entry";

export interface UserPermission {
  action: string;
  scope: string;
  scopeId: number | null;
}

// Scope hierarchy: global > collection > entry > own
const SCOPE_RANK: Record<string, number> = {
  global: 3,
  collection: 2,
  entry: 1,
  own: 0,
};

/**
 * Load effective permissions for a user.
 * Resolution order: User.directRole.permissions ?? User.group.role.permissions ?? []
 */
export async function getUserPermissions(userId: number): Promise<UserPermission[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      directRole: { include: { permissions: true } },
      group: {
        include: {
          role: { include: { permissions: true } },
        },
      },
    },
  });

  if (!user) return [];

  // Use direct role if set
  if (user.directRole?.permissions && user.directRole.permissions.length > 0) {
    return user.directRole.permissions.map((p) => ({
      action: p.action,
      scope: p.scope,
      scopeId: p.scopeId,
    }));
  }

  // Fall back to group's role
  if (user.group?.role?.permissions && user.group.role.permissions.length > 0) {
    return user.group.role.permissions.map((p) => ({
      action: p.action,
      scope: p.scope,
      scopeId: p.scopeId,
    }));
  }

  // No permissions configured — return viewer-level (read only)
  return [{ action: "read", scope: "global", scopeId: null }];
}

/**
 * Check if permissions include the required action with sufficient scope.
 */
export function hasPermission(
  permissions: UserPermission[],
  action: PermissionAction,
  opts?: { scope?: PermissionScope; scopeId?: number; entryAuthorId?: number | null; userId?: number | null }
): boolean {
  for (const p of permissions) {
    if (p.action !== action) continue;

    // "own" scope: user can only act on entries they authored
    if (p.scope === "own") {
      if (opts?.entryAuthorId != null && opts?.userId != null && opts.entryAuthorId === opts.userId) {
        return true;
      }
      continue;
    }

    // Global scope grants everything
    if (p.scope === "global") return true;

    // Collection scope: check if the requested scopeId matches
    if (p.scope === "collection" && opts?.scope === "collection" && p.scopeId === opts.scopeId) {
      return true;
    }

    // Entry scope: check if the requested entry matches
    if (p.scope === "entry" && opts?.scope === "entry" && p.scopeId === opts.scopeId) {
      return true;
    }

    // If no specific scope requirement, accept any non-own scope
    if (!opts?.scope && SCOPE_RANK[p.scope] > SCOPE_RANK["own"]) {
      return true;
    }
  }

  return false;
}

/**
 * Get collection IDs that a user can access.
 * Rules:
 * - Admin role: returns null (means all collections)
 * - If a collection has NO CollectionAccess rows: everyone with read permission can see it (open)
 * - If a collection HAS CollectionAccess rows: only listed roles can see it (restricted)
 */
export async function getAccessibleCollectionIds(userId: number, effectiveRole: string): Promise<number[] | null> {
  // Admin sees everything
  if (effectiveRole === 'admin') return null;

  // Get user's role IDs (direct + group)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleId: true,
      group: { select: { roleId: true } },
    },
  });

  const roleIds: number[] = [];
  if (user?.roleId) roleIds.push(user.roleId);
  if (user?.group?.roleId) roleIds.push(user.group.roleId);

  // Find all collections that have access restrictions
  const restrictedAccess = await prisma.collectionAccess.findMany({
    select: { collectionId: true, roleId: true },
  });

  // Collections with restrictions
  const restrictedCollectionIds = new Set(restrictedAccess.map(a => a.collectionId));

  // All collections
  const allCollections = await prisma.collection.findMany({ select: { id: true } });

  // Open collections (no restrictions) + restricted collections where user's role is listed
  const accessible: number[] = [];
  for (const col of allCollections) {
    if (!restrictedCollectionIds.has(col.id)) {
      // Open collection — everyone can see
      accessible.push(col.id);
    } else if (roleIds.some(rid => restrictedAccess.some(a => a.collectionId === col.id && a.roleId === rid))) {
      // User's role is in the access list
      accessible.push(col.id);
    }
  }

  return accessible;
}

/**
 * Check if a user can read an entry, considering collection-scoped permissions.
 */
export async function canReadEntry(
  permissions: UserPermission[],
  entryId: number
): Promise<boolean> {
  // Global read grants everything
  if (hasPermission(permissions, "read")) return true;

  // Check collection-scoped read permissions
  const collectionScopeIds = permissions
    .filter((p) => p.action === "read" && p.scope === "collection" && p.scopeId != null)
    .map((p) => p.scopeId!);

  if (collectionScopeIds.length === 0) return false;

  // Check if entry belongs to any of the granted collections
  const count = await prisma.entry.count({
    where: {
      id: entryId,
      collections: { some: { id: { in: collectionScopeIds } } },
    },
  });

  return count > 0;
}
