import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageUsers, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageUsers(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const groupId = parseInt(id);
  const { userId } = await request.json();

  if (!userId) return jsonError("userId is required", 400);

  const userGroup = await prisma.userGroup.create({
    data: { userId: parseInt(userId), groupId },
  });

  return NextResponse.json(userGroup, { status: 201 });
}
