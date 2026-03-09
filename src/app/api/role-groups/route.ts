import { NextResponse } from "next/server";
import { canManageUsers, getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeRoleGroup } from "@/lib/role-groups";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.roleGroup.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ groups: groups.map(serializeRoleGroup) });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim() || null;
  const role = String(body.role || "viewer");

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const group = await prisma.roleGroup.create({
    data: { name, description, role },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ group: serializeRoleGroup(group) }, { status: 201 });
}
