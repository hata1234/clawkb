import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const groupId = Number(id);
  const { name, description, roleId } = await request.json();

  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(roleId !== undefined && { roleId: roleId ? Number(roleId) : null }),
    },
    include: {
      role: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      roleId: group.roleId,
      role: group.role ? { id: group.role.id, name: group.role.name } : null,
      memberCount: group._count.users,
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

  // Unassign users from this group first
  await prisma.user.updateMany({ where: { groupId }, data: { groupId: null } });
  await prisma.group.delete({ where: { id: groupId } });

  return NextResponse.json({ ok: true });
}
