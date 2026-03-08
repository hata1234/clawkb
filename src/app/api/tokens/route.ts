import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/prisma";
import { ensureApiTokensTable, generateToken, hashToken } from "@/lib/auth-token";

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

  await ensureApiTokensTable();

  const { rows } = await pool.query(
    `SELECT id, name, token_prefix, created_at, last_used_at, revoked
     FROM api_tokens ORDER BY created_at DESC`
  );

  return NextResponse.json(rows);
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

  await ensureApiTokensTable();

  const { rows } = await pool.query(
    `INSERT INTO api_tokens (name, token_hash, token_prefix)
     VALUES ($1, $2, $3)
     RETURNING id, name, token_prefix, created_at`,
    [name, hash, prefix]
  );

  return NextResponse.json({ ...rows[0], token }, { status: 201 });
}
