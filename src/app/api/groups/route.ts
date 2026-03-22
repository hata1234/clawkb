import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const groups = await prisma.group.findMany({
    include: {
      role: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      roleId: g.roleId,
      role: g.role ? { id: g.role.id, name: g.role.name } : null,
      memberCount: g._count.users,
    })),
  });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { name, description, roleId } = await request.json();
  if (!name || typeof name !== "string") return jsonError("name is required", 400);

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description || null,
      roleId: roleId ? Number(roleId) : null,
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
  }, { status: 201 });
}
