import { prisma } from "./prisma";

export type CollectionRole = "admin" | "editor" | "viewer";

const RANK: Record<string, number> = { admin: 3, editor: 2, viewer: 1 };

/**
 * Get user's effective role for a specific collection.
 * Takes highest from all their groups.
 */
export async function getCollectionRole(
  userId: number | null,
  collectionId: number,
  isAdmin: boolean,
): Promise<CollectionRole | null> {
  if (isAdmin) return "admin";

  const groupIds = userId
    ? (await prisma.userGroup.findMany({ where: { userId }, select: { groupId: true } })).map((g) => g.groupId)
    : [];

  // Always include Everyone group
  const everyoneGroup = await prisma.group.findUnique({ where: { name: "Everyone" }, select: { id: true } });
  if (everyoneGroup && !groupIds.includes(everyoneGroup.id)) groupIds.push(everyoneGroup.id);

  if (groupIds.length === 0) return null;

  const roles = await prisma.groupCollectionRole.findMany({
    where: { collectionId, groupId: { in: groupIds } },
    select: { role: true },
  });

  if (roles.length === 0) return null;

  return roles.reduce((best, r) => (RANK[r.role] > RANK[best.role] ? r : best)).role as CollectionRole;
}

/**
 * Get all collection IDs user can access (any role).
 * Returns null = can see everything (isAdmin).
 */
export async function getAccessibleCollectionIds(userId: number | null, isAdmin: boolean): Promise<number[] | null> {
  if (isAdmin) return null;

  const groupIds = userId
    ? (await prisma.userGroup.findMany({ where: { userId }, select: { groupId: true } })).map((g) => g.groupId)
    : [];

  const everyoneGroup = await prisma.group.findUnique({ where: { name: "Everyone" }, select: { id: true } });
  if (everyoneGroup && !groupIds.includes(everyoneGroup.id)) groupIds.push(everyoneGroup.id);

  if (groupIds.length === 0) return [];

  const gcrs = await prisma.groupCollectionRole.findMany({
    where: { groupId: { in: groupIds } },
    select: { collectionId: true },
    distinct: ["collectionId"],
  });

  return gcrs.map((g) => g.collectionId);
}

/**
 * Check if user can edit an entry in a collection.
 * admin → edit all; editor → edit own only; viewer → no
 */
export async function canEditEntry(
  userId: number | null,
  entry: { authorId: number | null; collections: { id: number }[] },
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) return true;
  if (!userId) return false;

  for (const col of entry.collections) {
    const role = await getCollectionRole(userId, col.id, false);
    if (role === "admin") return true;
    if (role === "editor" && entry.authorId === userId) return true;
  }

  // Entry not in any collection — registered users can edit own
  if (entry.collections.length === 0 && entry.authorId === userId) return true;

  return false;
}

export async function canDeleteEntry(
  userId: number | null,
  entry: { authorId: number | null; collections: { id: number }[] },
  isAdmin: boolean,
): Promise<boolean> {
  return canEditEntry(userId, entry, isAdmin);
}
