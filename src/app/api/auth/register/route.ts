import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_AUTH, getSetting } from "@/lib/settings";
import { makeVerificationToken, serializeUser, userWithGroupInclude } from "@/lib/users";

export async function POST(request: Request) {
  const settings = await getSetting("auth", DEFAULT_AUTH);
  if (!settings.allowRegistration) {
    return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
  }

  const body = await request.json();
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const displayName = String(body.displayName || username).trim();

  if (!username || !email || !password) {
    return NextResponse.json({ error: "username, email, and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = settings.requireEmailVerification ? makeVerificationToken() : null;
  const approvalStatus = settings.requireEmailVerification
    ? "pending_verification"
    : settings.requireAdminApproval
      ? "pending_approval"
      : "approved";

  const user = await prisma.user.create({
    data: {
      username,
      email,
      displayName,
      passwordHash,
      role: "viewer",
      approvalStatus,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationToken
        ? new Date(Date.now() + 1000 * 60 * 60 * 24)
        : null,
      emailVerifiedAt: settings.requireEmailVerification ? null : new Date(),
    },
    include: userWithGroupInclude,
  });

  return NextResponse.json({
    user: serializeUser(user),
    requiresEmailVerification: settings.requireEmailVerification,
    requiresAdminApproval: settings.requireAdminApproval,
    verificationToken,
  }, { status: 201 });
}
