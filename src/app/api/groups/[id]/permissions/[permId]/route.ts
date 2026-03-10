import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; permId: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { permId } = await params;

  await prisma.permission.delete({ where: { id: parseInt(permId) } });
  return NextResponse.json({ ok: true });
}
