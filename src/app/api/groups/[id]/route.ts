import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const groupId = Number(id);
  const { name, description, userIds, collectionRoles } = await request.json();

  const existing = await prisma.group.findUnique({ where: { id: groupId } });
  if (!existing) return jsonError("Group not found", 404);

  // Update basic fields
  const data: Record<string, unknown> = {};
  if (name && !existing.builtIn) data.name = name.trim();
  if (description !== undefined) data.description = description || null;

  await prisma.group.update({ where: { id: groupId }, data });

  // Update members (skip for Everyone group)
  if (userIds !== undefined && existing.name !== "Everyone") {
    await prisma.userGroup.deleteMany({ where: { groupId } });
    if (Array.isArray(userIds) && userIds.length > 0) {
      await prisma.userGroup.createMany({
        data: (userIds as number[]).map(userId => ({ userId, groupId })),
        skipDuplicates: true,
      });
    }
  }

  // Update collection roles
  if (collectionRoles !== undefined) {
    await prisma.groupCollectionRole.deleteMany({ where: { groupId } });
    if (Array.isArray(collectionRoles) && collectionRoles.length > 0) {
      await prisma.groupCollectionRole.createMany({
        data: (collectionRoles as { collectionId: number; role: string }[]).map(cr => ({
          groupId,
          collectionId: cr.collectionId,
          role: cr.role || "viewer",
        })),
        skipDuplicates: true,
      });
    }
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      _count: { select: { users: true } },
      collectionRoles: { include: { collection: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    group: {
      id: group!.id,
      name: group!.name,
      description: group!.description,
      builtIn: group!.builtIn,
      memberCount: group!._count.users,
      collectionRoles: group!.collectionRoles.map(cr => ({
        collectionId: cr.collectionId,
        collectionName: cr.collection.name,
        role: cr.role,
      })),
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const groupId = Number(id);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return jsonError("Group not found", 404);
  if (group.builtIn) return jsonError("Cannot delete built-in group", 400);

  await prisma.group.delete({ where: { id: groupId } });

  return NextResponse.json({ ok: true });
}
