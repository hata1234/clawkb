import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { prisma, pool } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding";

export async function POST(request: Request) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, limit = 10 } = await request.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  // 1. Try vector search first
  try {
    const queryEmbedding = await generateEmbedding(query);
    if (queryEmbedding) {
      const vectorStr = `[${queryEmbedding.join(",")}]`;
      const { rows } = await pool.query(
        `SELECT e.*, 1 - (embedding <=> $1::vector) as similarity
         FROM "Entry" e
         WHERE embedding IS NOT NULL
         ORDER BY similarity DESC
         LIMIT $2`,
        [vectorStr, limit]
      );
      if (rows.length > 0) {
        return NextResponse.json({ results: rows, query, mode: "vector" });
      }
    }
  } catch (err) {
    console.error("Vector search failed, falling back to fulltext:", err);
  }

  // 2. Fulltext search (tsvector)
  try {
    const { rows } = await pool.query(
      `SELECT *, ts_rank(tsv, plainto_tsquery('simple', $1)) as rank
       FROM "Entry"
       WHERE tsv @@ plainto_tsquery('simple', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [query, limit]
    );
    if (rows.length > 0) {
      return NextResponse.json({ results: rows, query, mode: "fulltext" });
    }
  } catch (err) {
    console.error("Fulltext search failed, falling back to ilike:", err);
  }

  // 3. ILIKE fallback
  const entries = await prisma.entry.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ results: entries, query, mode: "ilike" });
}
