import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/auth/verify-email?token=xxx — handle email link clicks */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  if (!token) {
    return new NextResponse(errorPage("Missing token", "No verification token provided."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return new NextResponse(errorPage("Invalid or Expired", "This verification link is invalid or has expired. Please register again or contact an administrator."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
      approvalStatus: "pending_approval",
    },
  });

  return new NextResponse(successPage(user.displayName || user.username), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function successPage(name: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email Verified</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0d0d0d;color:#e5e5e5}
.card{text-align:center;max-width:420px;padding:48px 32px;border-radius:16px;background:#1a1a1a;border:1px solid #333}
h1{color:#c9a96e;font-size:1.5rem;margin-bottom:12px}p{color:#999;line-height:1.6}
a{display:inline-block;margin-top:20px;padding:12px 28px;background:#c9a96e;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}</style>
</head><body><div class="card"><h1>✅ Email Verified</h1><p>Welcome, <strong>${name}</strong>! Your email has been verified successfully.</p><p>Your account is now pending admin approval. You'll be able to log in once approved.</p><a href="/login">Go to Login</a></div></body></html>`;
}

function errorPage(title: string, msg: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0d0d0d;color:#e5e5e5}
.card{text-align:center;max-width:420px;padding:48px 32px;border-radius:16px;background:#1a1a1a;border:1px solid #333}
h1{color:#ef4444;font-size:1.5rem;margin-bottom:12px}p{color:#999;line-height:1.6}
a{display:inline-block;margin-top:20px;padding:12px 28px;background:#333;color:#e5e5e5;text-decoration:none;border-radius:8px;font-weight:600}</style>
</head><body><div class="card"><h1>❌ ${title}</h1><p>${msg}</p><a href="/register">Register Again</a></div></body></html>`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const token = String(body.token || "").trim();
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
      approvalStatus: "pending_approval",
    },
  });

  return NextResponse.json({ ok: true });
}
