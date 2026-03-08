import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/prisma";
import { ensureApiTokensTable } from "@/lib/auth-token";

// DELETE /api/tokens/[id] — revoke a token
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tokenId = parseInt(id, 10);
  if (isNaN(tokenId)) {
    return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
  }

  await ensureApiTokensTable();

  const { rowCount } = await pool.query(
    `UPDATE api_tokens SET revoked = TRUE WHERE id = $1`,
    [tokenId]
  );

  if (!rowCount) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
