import { NextResponse } from "next/server";
import { canManageUsers, getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeRoleGroup } from "@/lib/role-groups";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const groupId = Number(id);
  const body = await request.json();

  const group = await prisma.roleGroup.update({
    where: { id: groupId },
    data: {
      name: body.name === undefined ? undefined : String(body.name || "").trim(),
      description: body.description === undefined ? undefined : String(body.description || "").trim() || null,
      role: body.role === undefined ? undefined : String(body.role || "viewer"),
    },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ group: serializeRoleGroup(group) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const groupId = Number(id);
  const group = await prisma.roleGroup.findUnique({
    where: { id: groupId },
    include: { _count: { select: { users: true } } },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (group._count.users > 0) {
    return NextResponse.json({ error: "Move users out of this group before deletion" }, { status: 400 });
  }

  await prisma.roleGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ ok: true });
}
