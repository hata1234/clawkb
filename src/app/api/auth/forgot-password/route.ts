import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true, message: "If an account with that email exists, a reset link has been sent." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    },
  });

  await sendPasswordResetEmail(
    { email: user.email!, displayName: user.displayName, username: user.username },
    token,
  );

  return NextResponse.json({ ok: true, message: "If an account with that email exists, a reset link has been sent." });
}
