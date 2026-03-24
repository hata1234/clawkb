import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { canManageUsers, getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUser, userWithGroupInclude } from "@/lib/users";

/** GET /api/users/:id — fetch user stats (entry count etc.) for delete confirmation */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userWithGroupInclude,
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const entryCount = await prisma.entry.count({ where: { authorId: userId } });
  const commentCount = await prisma.entryComment.count({ where: { authorId: userId } });

  return NextResponse.json({
    user: serializeUser(user),
    stats: { entryCount, commentCount },
  });
}

/** DELETE /api/users/:id — delete user with optional entry transfer */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  if (userId === principal.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action: string = body.entryAction || "transfer"; // "transfer" | "delete"
  const transferToId: number | null = body.transferToId ? Number(body.transferToId) : null;

  const entryCount = await prisma.entry.count({ where: { authorId: userId } });

  if (entryCount > 0) {
    if (action === "delete") {
      // Hard-delete all entries by this user (cascades chunks, comments, revisions, etc.)
      await prisma.entry.deleteMany({ where: { authorId: userId } });
    } else if (action === "transfer" && transferToId) {
      // Verify target user exists
      const target = await prisma.user.findUnique({ where: { id: transferToId } });
      if (!target) {
        return NextResponse.json({ error: "Transfer target user not found" }, { status: 400 });
      }
      await prisma.entry.updateMany({ where: { authorId: userId }, data: { authorId: transferToId } });
      await prisma.entryRevision.updateMany({ where: { authorId: userId }, data: { authorId: transferToId } });
    } else if (entryCount > 0) {
      return NextResponse.json(
        { error: "User has entries. Specify entryAction: 'transfer' with transferToId, or 'delete'" },
        { status: 400 },
      );
    }
  }

  // Delete user (cascades: UserGroup, UserFavorite, Notification, EntryComment, ShareLink)
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ deleted: true, entriesAffected: entryCount, action });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.email !== undefined)
    data.email =
      String(body.email || "")
        .trim()
        .toLowerCase() || null;
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
        data: (body.groupIds as number[]).map((groupId) => ({ userId, groupId })),
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
