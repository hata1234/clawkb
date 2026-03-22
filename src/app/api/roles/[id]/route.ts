import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const roleId = Number(id);
  const { name, description } = await request.json();

  const role = await prisma.role.update({
    where: { id: roleId },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
    },
    include: { permissions: true },
  });

  return NextResponse.json({ role });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const roleId = Number(id);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return jsonError("Role not found", 404);
  if (role.builtIn) return jsonError("Cannot delete built-in roles", 400);

  await prisma.role.delete({ where: { id: roleId } });
  return NextResponse.json({ ok: true });
}
