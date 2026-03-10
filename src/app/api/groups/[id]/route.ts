import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const groupId = parseInt(id);
  const { name, description } = await request.json();

  const group = await prisma.permissionGroup.update({
    where: { id: groupId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description: description || null }),
    },
    include: { permissions: true, users: true },
  });

  return NextResponse.json(group);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const groupId = parseInt(id);

  const group = await prisma.permissionGroup.findUnique({ where: { id: groupId } });
  if (!group) return jsonError("Group not found", 404);
  if (group.builtIn) return jsonError("Cannot delete built-in groups", 400);

  await prisma.permissionGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ ok: true });
}
