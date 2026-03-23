import { NextResponse } from "next/server";
import { getRequestPrincipal, canManageSettings, jsonError } from "@/lib/auth";
import { pool } from "@/lib/prisma";
import { generateEmbedding, buildEmbeddingInput, storeEmbedding, generateAndStoreChunks } from "@/lib/embedding";

// POST: trigger full embedding rebuild (streaming progress)
export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden", 403);

  const body = await request.json().catch(() => ({}));
  const force = body.force === true; // re-embed all, or only NULL
  const mode = body.mode || "chunked"; // "legacy" or "chunked"

  const whereClause = force
    ? ""
    : mode === "chunked"
      ? `WHERE NOT EXISTS (SELECT 1 FROM entry_chunks ec WHERE ec.entry_id = e.id)`
      : `WHERE embedding IS NULL`;

  const entries = await pool.query(`SELECT id, title, summary, content FROM "Entry" e ${whereClause} ORDER BY id`);

  const total = entries.rows.length;
  let success = 0;
  let failed = 0;
  let totalChunks = 0;
  const errors: { id: number; title: string; error?: string }[] = [];

  for (const entry of entries.rows) {
    try {
      if (mode === "chunked") {
        const result = await generateAndStoreChunks(entry);
        totalChunks += result.totalChunks;
        success++;
      } else {
        // Legacy mode: only title+summary
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
    } catch (err) {
      failed++;
      errors.push({
        id: entry.id,
        title: entry.title.slice(0, 60),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ total, success, failed, totalChunks, mode, errors });
}

// GET: check embedding status (how many have/missing embeddings)
export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const [entryResult, chunkResult] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as embedded,
        COUNT(*) - COUNT(embedding) as missing
      FROM "Entry"
    `),
    pool.query(`
      SELECT
        COUNT(DISTINCT entry_id) as entries_with_chunks,
        COUNT(*) as total_chunks
      FROM entry_chunks
    `),
  ]);

  const row = entryResult.rows[0];
  const chunkRow = chunkResult.rows[0];
  return NextResponse.json({
    total: parseInt(row.total),
    embedded: parseInt(row.embedded),
    missing: parseInt(row.missing),
    chunked: parseInt(chunkRow.entries_with_chunks),
    totalChunks: parseInt(chunkRow.total_chunks),
  });
}
