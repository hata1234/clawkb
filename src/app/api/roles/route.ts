import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const roles = await prisma.role.findMany({
    include: {
      permissions: true,
      _count: { select: { users: true, groups: true } },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      builtIn: r.builtIn,
      permissions: r.permissions.map((p) => ({ id: p.id, action: p.action, scope: p.scope, scopeId: p.scopeId })),
      userCount: r._count.users,
      groupCount: r._count.groups,
    })),
  });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { name, description, permissions } = await request.json();
  if (!name || typeof name !== "string") return jsonError("name is required", 400);

  const role = await prisma.role.create({
    data: {
      name: name.trim(),
      description: description || null,
      permissions: permissions?.length
        ? {
            create: permissions.map((p: { action: string; scope?: string; scopeId?: number }) => ({
              action: p.action,
              scope: p.scope || "global",
              scopeId: p.scopeId ?? null,
            })),
          }
        : undefined,
    },
    include: { permissions: true },
  });

  return NextResponse.json({ role }, { status: 201 });
}
