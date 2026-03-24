import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/login-check
 * Pre-validates credentials and returns specific status before NextAuth signIn.
 * Returns: { ok: true } or { error: string, code: string }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required", code: "missing_fields" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or password", code: "invalid_credentials" },
      { status: 401 },
    );
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid username or password", code: "invalid_credentials" },
      { status: 401 },
    );
  }

  // Credentials are correct — now check account status
  if (user.approvalStatus === "pending_verification") {
    return NextResponse.json(
      { error: "Please verify your email before logging in.", code: "pending_verification" },
      { status: 403 },
    );
  }

  if (user.approvalStatus === "pending_approval") {
    return NextResponse.json(
      { error: "Your account is pending admin approval.", code: "pending_approval" },
      { status: 403 },
    );
  }

  if (user.approvalStatus === "rejected") {
    return NextResponse.json(
      { error: "Your account registration has been rejected.", code: "rejected" },
      { status: 403 },
    );
  }

  if (user.approvalStatus !== "approved") {
    return NextResponse.json(
      { error: "Your account is not active.", code: "not_active" },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
