import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const roleId = Number(id);

  const permissions = await prisma.permission.findMany({
    where: { roleId },
    orderBy: { action: "asc" },
  });

  return NextResponse.json({ permissions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const roleId = Number(id);
  const { action, scope, scopeId } = await request.json();

  if (!action) return jsonError("action is required", 400);

  const permission = await prisma.permission.create({
    data: {
      roleId,
      action,
      scope: scope || "global",
      scopeId: scopeId ?? null,
    },
  });

  return NextResponse.json({ permission }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const roleId = Number(id);

  // If body has specific action, delete that one; otherwise delete all
  let body: { action?: string; scope?: string } = {};
  try { body = await request.json(); } catch { /* no body = delete all */ }

  if (body.action) {
    await prisma.permission.deleteMany({
      where: { roleId, action: body.action, ...(body.scope ? { scope: body.scope } : {}) },
    });
  } else {
    await prisma.permission.deleteMany({ where: { roleId } });
  }

  return NextResponse.json({ ok: true });
}
