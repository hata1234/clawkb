import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApiToken, type ApiTokenType } from "@/lib/auth-token";

async function requireSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

// GET /api/tokens — list all tokens (name, prefix, dates, revoked)
export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.apiToken.findMany({
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      tokenType: true,
      userId: true,
      createdAt: true,
      lastUsedAt: true,
      revoked: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    tokens.map((t) => ({
      id: t.id,
      name: t.name,
      token_prefix: t.tokenPrefix,
      token_type: t.tokenType,
      user_id: t.userId,
      created_at: t.createdAt,
      last_used_at: t.lastUsedAt,
      revoked: t.revoked,
    })),
  );
}

// POST /api/tokens — create new token bound to current user, return full token once
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = body.name || "Unnamed token";
  const tokenType: ApiTokenType = body.tokenType === "agent" ? "agent" : "user";
  const userId = Number(session.user!.id);

  const result = await createApiToken({ name, userId, tokenType });

  return NextResponse.json(
    {
      id: result.id,
      name: result.name,
      token_prefix: result.token_prefix,
      token_type: result.token_type,
      user_id: result.user_id,
      created_at: new Date().toISOString(),
      token: result.token,
    },
    { status: 201 },
  );
}
