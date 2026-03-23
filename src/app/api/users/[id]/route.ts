import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { canManageUsers, getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUser, userWithGroupInclude } from "@/lib/users";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.email !== undefined) data.email = String(body.email || "").trim().toLowerCase() || null;
  if (body.displayName !== undefined) data.displayName = String(body.displayName || "").trim() || null;
  if (body.isAdmin !== undefined) data.isAdmin = Boolean(body.isAdmin);
  if (body.approvalStatus !== undefined) data.approvalStatus = String(body.approvalStatus || "pending_approval");
  if (body.avatarUrl !== undefined) data.avatarUrl = String(body.avatarUrl || "").trim() || null;
  if (body.bio !== undefined) data.bio = String(body.bio || "").trim() || null;
  if (body.password) data.passwordHash = await bcrypt.hash(String(body.password), 12);

  await prisma.user.update({ where: { id: userId }, data });

  // Update group memberships if provided
  if (body.groupIds !== undefined) {
    await prisma.userGroup.deleteMany({ where: { userId } });
    if (Array.isArray(body.groupIds) && body.groupIds.length > 0) {
      await prisma.userGroup.createMany({
        data: (body.groupIds as number[]).map(groupId => ({ userId, groupId })),
        skipDuplicates: true,
      });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userWithGroupInclude,
  });

  return NextResponse.json({ user: serializeUser(user!) });
}
