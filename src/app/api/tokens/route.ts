import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/auth-token";

async function requireSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

// GET /api/tokens — list all tokens (name, prefix, dates, revoked)
export async function GET() {
  if (!await requireSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.apiToken.findMany({
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      revoked: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens.map((t) => ({
    id: t.id,
    name: t.name,
    token_prefix: t.tokenPrefix,
    created_at: t.createdAt,
    last_used_at: t.lastUsedAt,
    revoked: t.revoked,
  })));
}

// POST /api/tokens — create new token, return full token once
export async function POST(request: Request) {
  if (!await requireSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = body.name || "Unnamed token";

  const token = generateToken();
  const hash = hashToken(token);
  const prefix = token.substring(0, 12);

  const record = await prisma.apiToken.create({
    data: {
      name,
      tokenHash: hash,
      tokenPrefix: prefix,
    },
  });

  return NextResponse.json({
    id: record.id,
    name: record.name,
    token_prefix: record.tokenPrefix,
    created_at: record.createdAt,
    token,
  }, { status: 201 });
}
