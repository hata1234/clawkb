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

  const data: {
    email?: string | null;
    displayName?: string | null;
    role?: string;
    roleId?: number | null;
    groupId?: number | null;
    approvalStatus?: string;
    avatarUrl?: string | null;
    bio?: string | null;
    passwordHash?: string;
  } = {};

  if (body.email !== undefined) data.email = String(body.email || "").trim().toLowerCase() || null;
  if (body.displayName !== undefined) data.displayName = String(body.displayName || "").trim() || null;
  if (body.role !== undefined) data.role = String(body.role || "viewer");
  if (body.roleId !== undefined) data.roleId = body.roleId ? Number(body.roleId) : null;
  if (body.groupId !== undefined) data.groupId = body.groupId ? Number(body.groupId) : null;
  if (body.approvalStatus !== undefined) data.approvalStatus = String(body.approvalStatus || "pending_approval");
  if (body.avatarUrl !== undefined) data.avatarUrl = String(body.avatarUrl || "").trim() || null;
  if (body.bio !== undefined) data.bio = String(body.bio || "").trim() || null;
  if (body.password) data.passwordHash = await bcrypt.hash(String(body.password), 12);

  // If roleId is set, also sync the legacy role string
  if (data.roleId !== undefined && data.roleId !== null) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (role) {
      const n = role.name.toLowerCase();
      data.role = n === "admin" || n === "editor" || n === "viewer" ? n : "viewer";
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: userWithGroupInclude,
  });

  return NextResponse.json({ user: serializeUser(user) });
}
