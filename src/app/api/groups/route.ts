import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden: admin only", 403);

  const groups = await prisma.group.findMany({
    include: {
      _count: { select: { users: true } },
      users: { include: { user: { select: { id: true, username: true, displayName: true } } } },
      collectionRoles: {
        include: { collection: { select: { id: true, name: true } } },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      builtIn: g.builtIn,
      memberCount: g._count.users,
      users: g.users.map((ug) => ({ id: ug.user.id, username: ug.user.username, displayName: ug.user.displayName })),
      collectionRoles: g.collectionRoles.map((cr) => ({
        collectionId: cr.collectionId,
        collectionName: cr.collection.name,
        role: cr.role,
      })),
      canCreateCollections: g.canCreateCollections,
      canUseRag: g.canUseRag,
      canExport: g.canExport,
      canManageWebhooks: g.canManageWebhooks,
    })),
  });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { name, description, userIds, collectionRoles } = await request.json();
  if (!name || typeof name !== "string") return jsonError("name is required", 400);

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description || null,
      ...(userIds &&
        userIds.length > 0 && {
          users: {
            create: (userIds as number[]).map((userId) => ({ userId })),
          },
        }),
      ...(collectionRoles &&
        collectionRoles.length > 0 && {
          collectionRoles: {
            create: (collectionRoles as { collectionId: number; role: string }[]).map((cr) => ({
              collectionId: cr.collectionId,
              role: cr.role || "viewer",
            })),
          },
        }),
    },
    include: {
      _count: { select: { users: true } },
      collectionRoles: { include: { collection: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(
    {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        builtIn: group.builtIn,
        memberCount: group._count.users,
        collectionRoles: group.collectionRoles.map((cr) => ({
          collectionId: cr.collectionId,
          collectionName: cr.collection.name,
          role: cr.role,
        })),
      },
    },
    { status: 201 },
  );
}
