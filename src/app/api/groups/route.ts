import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const groups = await prisma.permissionGroup.findMany({
    include: {
      permissions: true,
      users: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { name, description } = await request.json();
  if (!name || typeof name !== "string") return jsonError("name is required", 400);

  const group = await prisma.permissionGroup.create({
    data: { name, description: description || null },
    include: { permissions: true, users: true },
  });

  return NextResponse.json(group, { status: 201 });
}
