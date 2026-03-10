import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageSettings, jsonError } from "@/lib/auth";
import { pool } from "@/lib/prisma";
import { generateEmbedding, buildEmbeddingInput, storeEmbedding } from "@/lib/embedding";

// POST: trigger full embedding rebuild (streaming progress)
export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden", 403);

  const body = await request.json().catch(() => ({}));
  const force = body.force === true; // re-embed all, or only NULL

  const whereClause = force ? "" : `WHERE embedding IS NULL`;
  const entries = await pool.query(
    `SELECT id, title, summary, content FROM "Entry" ${whereClause} ORDER BY id`
  );

  const total = entries.rows.length;
  let success = 0;
  let failed = 0;
  const errors: { id: number; title: string }[] = [];

  for (const entry of entries.rows) {
    const text = buildEmbeddingInput(entry);
    const embedding = await generateEmbedding(text);
    if (embedding) {
      await storeEmbedding(entry.id, embedding);
      success++;
    } else {
      failed++;
      errors.push({ id: entry.id, title: entry.title.slice(0, 60) });
    }
  }

  return NextResponse.json({ total, success, failed, errors });
}

// GET: check embedding status (how many have/missing embeddings)
export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as embedded,
      COUNT(*) - COUNT(embedding) as missing
    FROM "Entry"
  `);

  const row = result.rows[0];
  return NextResponse.json({
    total: parseInt(row.total),
    embedded: parseInt(row.embedded),
    missing: parseInt(row.missing),
  });
}
