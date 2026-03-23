import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { canManageUsers, getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUser, userWithGroupInclude } from "@/lib/users";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: userWithGroupInclude,
  });

  return NextResponse.json({ users: users.map(serializeUser) });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageUsers(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const username = String(body.username || "").trim();
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const password = String(body.password || "");
  const displayName = String(body.displayName || username).trim();

  if (!username || !password) {
    return NextResponse.json({ error: "username and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, ...(email ? [{ email }] : [])],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Find the Users built-in group
  const usersGroup = await prisma.group.findUnique({ where: { name: "Users" } });

  const user = await prisma.user.create({
    data: {
      username,
      email,
      displayName,
      passwordHash,
      isAdmin: Boolean(body.isAdmin),
      approvalStatus: body.approvalStatus || "approved",
      emailVerifiedAt: new Date(),
      agent: Boolean(body.agent),
      avatarUrl: body.avatarUrl ? String(body.avatarUrl) : null,
      createdById: principal.id,
      groups: {
        create: [
          // Auto-join Users group
          ...(usersGroup ? [{ groupId: usersGroup.id }] : []),
          // Additional groups
          ...(body.groupIds || [])
            .filter((gid: number) => gid !== usersGroup?.id)
            .map((gid: number) => ({ groupId: gid })),
        ],
      },
    },
    include: userWithGroupInclude,
  });

  return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
}
