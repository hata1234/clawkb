import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma, pool } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding";

function extractSnippet(content: string | null, query: string, maxLen = 200): string | null {
  if (!content) return null;
  const lower = content.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx >= 0) {
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + qLower.length + maxLen - 60);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet = snippet + "...";
    return snippet;
  }
  // No direct match, return first N chars
  return content.length > maxLen ? content.slice(0, maxLen) + "..." : content;
}

function highlightText(text: string | null, query: string): string | null {
  if (!text || !query) return text;
  const words = query.split(/\s+/).filter(Boolean);
  let result = text;
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
  }
  return result;
}

function buildFilterSQL(filters: {
  type?: string;
  status?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  collectionId?: string;
}): { clause: string; params: string[]; paramOffset: number } {
  const conditions: string[] = ['e."deletedAt" IS NULL'];
  const params: string[] = [];
  let idx = 0;

  if (filters.type) {
    idx++;
    conditions.push(`e."type" = $__${idx}`);
    params.push(filters.type);
  }
  if (filters.status) {
    idx++;
    conditions.push(`e."status" = $__${idx}`);
    params.push(filters.status);
  }
  if (filters.dateFrom) {
    idx++;
    conditions.push(`e."createdAt" >= $__${idx}::timestamptz`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    idx++;
    conditions.push(`e."createdAt" <= $__${idx}::timestamptz`);
    params.push(filters.dateTo);
  }
  if (filters.tags && filters.tags.length > 0) {
    idx++;
    conditions.push(`EXISTS (
      SELECT 1 FROM "_EntryTags" et
      JOIN "Tag" t ON t.id = et."B"
      WHERE et."A" = e.id AND t.name = ANY($__${idx}::text[])
    )`);
    params.push(filters.tags as unknown as string);
  }
  if (filters.collectionId) {
    idx++;
    conditions.push(`EXISTS (
      SELECT 1 FROM "_EntryCollections" ec
      WHERE ec."A" = $__${idx}::int AND ec."B" = e.id
    )`);
    params.push(filters.collectionId);
  }

  return { clause: conditions.join(" AND "), params, paramOffset: idx };
}

function resolveFilterParams(
  baseParams: unknown[],
  filterSQL: { clause: string; params: string[]; paramOffset: number },
  startIdx: number
): { sql: string; allParams: unknown[] } {
  let sql = filterSQL.clause;
  const allParams = [...baseParams];
  for (let i = 0; i < filterSQL.params.length; i++) {
    sql = sql.replace(`$__${i + 1}`, `$${startIdx + i}`);
    allParams.push(filterSQL.params[i]);
  }
  return { sql, allParams };
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    query,
    limit = 20,
    mode: requestedMode,
    type,
    status,
    tags,
    dateFrom,
    dateTo,
    collectionId,
  } = body;
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const filters = { type, status, tags, dateFrom, dateTo, collectionId };
  const filterInfo = buildFilterSQL(filters);
  const modes = requestedMode && requestedMode !== "auto"
    ? [requestedMode]
    : ["vector", "fulltext", "ilike"];

  // Try each mode in order
  for (const searchMode of modes) {
    if (searchMode === "vector") {
      try {
        const queryEmbedding = await generateEmbedding(query);
        if (queryEmbedding) {
          const vectorStr = `[${queryEmbedding.join(",")}]`;
          const baseParams = [vectorStr];
          const { sql: filterClause, allParams } = resolveFilterParams(baseParams, filterInfo, 2);

          // Search entry_chunks first, fall back to Entry.embedding
          const { rows: chunkRows } = await pool.query(
            `SELECT DISTINCT ON (e.id)
                    e.id, e.type, e.source, e.title, e.summary, e.content, e.status, e.url,
                    e."createdAt", e."updatedAt", e."authorId",
                    1 - (c.embedding <=> $1::vector) as similarity,
                    c.chunk_text as matched_chunk
             FROM entry_chunks c
             JOIN "Entry" e ON e.id = c.entry_id
             WHERE c.embedding IS NOT NULL AND ${filterClause}
             ORDER BY e.id, similarity DESC`,
            allParams
          );

          let rows;
          if (chunkRows.length > 0) {
            // Re-sort by similarity after DISTINCT ON
            rows = chunkRows.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
              (b.similarity as number) - (a.similarity as number)
            ).slice(0, limit as number);
          } else {
            // Fallback to Entry.embedding for entries without chunks
            const { rows: legacyRows } = await pool.query(
              `SELECT e.id, e.type, e.source, e.title, e.summary, e.content, e.status, e.url,
                      e."createdAt", e."updatedAt", e."authorId",
                      1 - (e.embedding <=> $1::vector) as similarity,
                      NULL as matched_chunk
               FROM "Entry" e
               WHERE e.embedding IS NOT NULL AND ${filterClause}
               ORDER BY similarity DESC
               LIMIT $2`,
              [...allParams, limit]
            );
            rows = legacyRows;
          }

          if (rows.length > 0) {
            const enriched = await enrichResults(rows, query, "vector");
            return NextResponse.json({ results: enriched, query, mode: "vector", total: rows.length });
          }
        }
      } catch (err) {
        console.error("Vector search failed:", err);
      }
    }

    if (searchMode === "fulltext") {
      try {
        const baseParams = [query, limit];
        const { sql: filterClause, allParams } = resolveFilterParams(baseParams, filterInfo, 2);
        const { rows } = await pool.query(
          `SELECT e.id, e.type, e.source, e.title, e.summary, e.content, e.status, e.url,
                  e."createdAt", e."updatedAt", e."authorId",
                  ts_rank(e.tsv, plainto_tsquery('simple', $1)) as rank
           FROM "Entry" e
           WHERE e.tsv @@ plainto_tsquery('simple', $1) AND ${filterClause}
           ORDER BY rank DESC
           LIMIT $2`,
          allParams
        );
        if (rows.length > 0) {
          const enriched = await enrichResults(rows, query, "fulltext");
          return NextResponse.json({ results: enriched, query, mode: "fulltext", total: rows.length });
        }
      } catch (err) {
        console.error("Fulltext search failed:", err);
      }
    }

    if (searchMode === "ilike") {
      const where: Record<string, unknown> = {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
        ...(type && { type }),
        ...(status && { status }),
        ...(tags?.length && { tags: { some: { name: { in: tags } } } }),
        ...(collectionId && { collections: { some: { id: parseInt(collectionId) } } }),
        ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
        ...(dateTo && { createdAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), lte: new Date(dateTo) } }),
      };

      const entries = await prisma.entry.findMany({
        where,
        include: {
          tags: true,
          collections: { select: { id: true, name: true, icon: true, color: true } },
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      const results = entries.map((e) => ({
        id: e.id,
        type: e.type,
        source: e.source,
        title: e.title,
        summary: e.summary,
        status: e.status,
        url: e.url,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        tags: e.tags,
        collections: e.collections,
        author: e.author ? { id: e.author.id, displayName: e.author.displayName || e.author.username, avatarUrl: e.author.avatarUrl } : null,
        snippet: extractSnippet(e.content, query),
        highlightedTitle: highlightText(e.title, query),
        highlightedSummary: highlightText(e.summary, query),
        similarity: null,
        rank: null,
      }));

      return NextResponse.json({ results, query, mode: "ilike", total: results.length });
    }
  }

  return NextResponse.json({ results: [], query, mode: "none", total: 0 });
}

async function enrichResults(
  rows: Record<string, unknown>[],
  query: string,
  mode: "vector" | "fulltext"
) {
  const ids = rows.map((r) => r.id as number);

  // Batch fetch tags, collections, authors
  const entries = await prisma.entry.findMany({
    where: { id: { in: ids } },
    include: {
      tags: true,
      collections: { select: { id: true, name: true, icon: true, color: true } },
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const entryMap = new Map(entries.map((e) => [e.id, e]));

  return rows.map((row) => {
    const entry = entryMap.get(row.id as number);
    return {
      id: row.id,
      type: row.type,
      source: row.source,
      title: row.title as string,
      summary: row.summary as string | null,
      status: row.status,
      url: row.url,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: entry?.tags || [],
      collections: entry?.collections || [],
      author: entry?.author
        ? { id: entry.author.id, displayName: entry.author.displayName || entry.author.username, avatarUrl: entry.author.avatarUrl }
        : null,
      snippet: (row.matched_chunk as string) || extractSnippet(row.content as string | null, query),
      highlightedTitle: highlightText(row.title as string, query),
      highlightedSummary: highlightText(row.summary as string | null, query),
      similarity: mode === "vector" ? Math.round(((row.similarity as number) || 0) * 100) : null,
      rank: mode === "fulltext" ? row.rank : null,
    };
  });
}
