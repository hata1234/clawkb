import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { pool } from "@/lib/prisma";
import { getAccessibleCollectionIds } from "@/lib/permissions";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collectionIds = await getAccessibleCollectionIds(principal.id, principal.isAdmin);

  const { searchParams } = new URL(request.url);
  const threshold = Math.max(0.5, Math.min(1, parseFloat(searchParams.get("threshold") || "0.75")));
  const typesParam = searchParams.get("types");
  const typeFilter = typesParam ? typesParam.split(",").filter(Boolean) : null;

  // Build ACL + type filter clauses
  const params: (string[] | number[] | number)[] = [];
  let paramIdx = 1;
  const clauses: string[] = ["embedding IS NOT NULL", '"deletedAt" IS NULL'];

  if (collectionIds) {
    clauses.push(`id IN (SELECT "A" FROM "_CollectionToEntry" WHERE "B" = ANY($${paramIdx}))`);
    params.push(collectionIds);
    paramIdx++;
  }

  if (typeFilter) {
    clauses.push(`type = ANY($${paramIdx})`);
    params.push(typeFilter);
    paramIdx++;
  }

  clauses.push(`1=1`); // ensure WHERE is valid
  params.push(200 as never);

  const nodeQuery = `
    SELECT id, title, type, source, summary
    FROM "Entry"
    WHERE ${clauses.join(" AND ")}
    ORDER BY "createdAt" DESC
    LIMIT $${paramIdx}
  `;
  const nodesResult = await pool.query(nodeQuery, params);
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
