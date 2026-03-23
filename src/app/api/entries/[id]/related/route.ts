import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { pool } from "@/lib/prisma";
import { getAccessibleCollectionIds } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id);
  if (isNaN(entryId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

  const collectionIds = await getAccessibleCollectionIds(principal.id, principal.isAdmin);

  try {
    // Get the current entry's embedding
    const { rows: [current] } = await pool.query(
      `SELECT embedding FROM "Entry" WHERE id = $1`,
      [entryId]
    );

    if (!current || !current.embedding) {
      return NextResponse.json({ related: [] });
    }

    // Build ACL filter
    const aclClause = collectionIds
      ? `AND e.id IN (SELECT "A" FROM "_CollectionToEntry" WHERE "B" = ANY($4))`
      : "";
    const queryParams: (string | number | number[])[] = [current.embedding, entryId, limit];
    if (collectionIds) queryParams.push(collectionIds);

    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.type, e.source, e.summary, e."createdAt",
              1 - (e.embedding <=> $1) as similarity
       FROM "Entry" e
       WHERE e.id != $2 AND e.embedding IS NOT NULL AND e."deletedAt" IS NULL
       ${aclClause}
       ORDER BY e.embedding <=> $1
       LIMIT $3`,
      queryParams
    );

    return NextResponse.json({ related: rows });
  } catch (err) {
    console.error("Related entries error:", err);
    return NextResponse.json({ error: "Failed to fetch related entries" }, { status: 500 });
  }
}
