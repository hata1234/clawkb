import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { pool } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id);
  if (isNaN(entryId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

  try {
    // Get the current entry's embedding
    const { rows: [current] } = await pool.query(
      `SELECT embedding FROM "Entry" WHERE id = $1`,
      [entryId]
    );

    if (!current || !current.embedding) {
      return NextResponse.json({ related: [] });
    }

    const { rows } = await pool.query(
      `SELECT id, title, type, source, summary, "createdAt",
              1 - (embedding <=> $1) as similarity
       FROM "Entry"
       WHERE id != $2 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1
       LIMIT $3`,
      [current.embedding, entryId, limit]
    );

    return NextResponse.json({ related: rows });
  } catch (err) {
    console.error("Related entries error:", err);
    return NextResponse.json({ error: "Failed to fetch related entries" }, { status: 500 });
  }
}
