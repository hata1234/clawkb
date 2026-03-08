import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { pool } from "@/lib/prisma";

export async function GET(request: Request) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const threshold = Math.max(0.5, Math.min(1, parseFloat(searchParams.get("threshold") || "0.75")));
  const typesParam = searchParams.get("types");
  const typeFilter = typesParam ? typesParam.split(",").filter(Boolean) : null;

  // Fetch entries with embeddings (limit 200 most recent)
  const typeClause = typeFilter ? `AND type = ANY($1)` : "";
  const nodeParams: (string[] | number)[] = typeFilter ? [typeFilter, 200] : [200];
  const nodeQuery = `
    SELECT id, title, type, source, summary
    FROM "Entry"
    WHERE embedding IS NOT NULL ${typeClause}
    ORDER BY "createdAt" DESC
    LIMIT $${nodeParams.length}
  `;
  const nodesResult = await pool.query(nodeQuery, nodeParams);
  const nodes = nodesResult.rows;

  if (nodes.length < 2) {
    return NextResponse.json({ nodes, edges: [] });
  }

  const nodeIds = nodes.map((n: { id: number }) => n.id);

  // Compute pairwise cosine similarity for entries with embeddings
  const edgeQuery = `
    SELECT a.id as source_id, b.id as target_id,
           1 - (a.embedding <=> b.embedding) as similarity
    FROM "Entry" a, "Entry" b
    WHERE a.id < b.id
      AND a.embedding IS NOT NULL AND b.embedding IS NOT NULL
      AND a.id = ANY($1) AND b.id = ANY($1)
      AND 1 - (a.embedding <=> b.embedding) > $2
  `;
  const edgesResult = await pool.query(edgeQuery, [nodeIds, threshold]);
  const edges = edgesResult.rows.map((r: { source_id: number; target_id: number; similarity: number }) => ({
    source: r.source_id,
    target: r.target_id,
    similarity: Math.round(r.similarity * 1000) / 1000,
  }));

  return NextResponse.json({ nodes, edges });
}
