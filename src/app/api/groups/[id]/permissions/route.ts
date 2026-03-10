import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const permissions = await prisma.permission.findMany({
    where: { groupId: parseInt(id) },
  });

  return NextResponse.json({ permissions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const groupId = parseInt(id);
  const { action, scope, scopeId } = await request.json();

  if (!action || !scope) return jsonError("action and scope are required", 400);

  const permission = await prisma.permission.create({
    data: { groupId, action, scope, scopeId: scopeId ?? null },
  });

  return NextResponse.json(permission, { status: 201 });
}
