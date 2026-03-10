import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id, userId } = await params;
  const groupId = parseInt(id);
  const uid = parseInt(userId);

  await prisma.userGroup.delete({
    where: { userId_groupId: { userId: uid, groupId } },
  });

  return NextResponse.json({ ok: true });
}
