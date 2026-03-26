import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { pool } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding";
import { getSetting, DEFAULT_RAG, type RagConfig } from "@/lib/settings";
import { getAccessibleCollectionIds, getUserFeaturePermissions } from "@/lib/permissions";

interface RagSource {
  entryId: number;
  title: string;
  similarity: number;
  chunkText: string;
}

function buildFilterSQL(
  filters: {
    type?: string;
    status?: string;
    tags?: string[];
    collectionId?: number;
  },
  accessibleCollectionIds?: number[] | null,
): { clause: string; params: unknown[]; paramOffset: number } {
  const conditions: string[] = ['e."deletedAt" IS NULL'];
  const params: unknown[] = [];
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
  if (filters.tags && filters.tags.length > 0) {
    idx++;
    conditions.push(`EXISTS (
      SELECT 1 FROM "_EntryTags" et
      JOIN "Tag" t ON t.id = et."B"
      WHERE et."A" = e.id AND t.name = ANY($__${idx}::text[])
    )`);
    params.push(filters.tags);
  }
  if (filters.collectionId) {
    idx++;
    conditions.push(`EXISTS (
      SELECT 1 FROM "_EntryCollections" ec
      WHERE ec."A" = $__${idx}::int AND ec."B" = e.id
    )`);
    params.push(filters.collectionId);
  }
  if (accessibleCollectionIds !== null && accessibleCollectionIds !== undefined) {
    idx++;
    conditions.push(`EXISTS (
      SELECT 1 FROM "_EntryCollections" ec
      WHERE ec."B" = e.id AND ec."A" = ANY($__${idx}::int[])
    )`);
    params.push(accessibleCollectionIds);
  }

  return { clause: conditions.join(" AND "), params, paramOffset: idx };
}

function resolveFilterParams(
  baseParams: unknown[],
  filterSQL: { clause: string; params: unknown[]; paramOffset: number },
  startIdx: number,
): { sql: string; allParams: unknown[] } {
  let sql = filterSQL.clause;
  const allParams = [...baseParams];
  for (let i = 0; i < filterSQL.params.length; i++) {
    sql = sql.replace(`$__${i + 1}`, `$${startIdx + i}`);
    allParams.push(filterSQL.params[i]);
  }
  return { sql, allParams };
}

async function retrieveChunks(
  queryEmbedding: number[],
  topK: number,
  filters: { type?: string; status?: string; tags?: string[]; collectionId?: number },
  accessibleCollectionIds?: number[] | null,
): Promise<RagSource[]> {
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  const filterInfo = buildFilterSQL(filters, accessibleCollectionIds);
  const baseParams = [vectorStr];
  const { sql: filterClause, allParams } = resolveFilterParams(baseParams, filterInfo, 2);

  const { rows } = await pool.query(
    `SELECT DISTINCT ON (e.id)
            e.id as entry_id, e.title,
            1 - (c.embedding <=> $1::vector) as similarity,
            c.chunk_text
     FROM entry_chunks c
     JOIN "Entry" e ON e.id = c.entry_id
     WHERE c.embedding IS NOT NULL AND ${filterClause}
     ORDER BY e.id, similarity DESC`,
    allParams,
  );

  // Re-sort by similarity and take topK
  return rows
    .sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => (b.similarity as number) - (a.similarity as number),
    )
    .slice(0, topK)
    .map((r: Record<string, unknown>) => ({
      entryId: r.entry_id as number,
      title: r.title as string,
      similarity: Math.round(((r.similarity as number) || 0) * 100),
      chunkText: r.chunk_text as string,
    }));
}

async function enrichWithPluginMetadata(sources: RagSource[]): Promise<Map<number, Record<string, unknown>>> {
  const entryIds = sources.map((s) => s.entryId);
  if (entryIds.length === 0) return new Map();
  try {
    const { rows } = await pool.query(
      `SELECT entry_id, document_number, document_level, status, effective_date,
              review_due_date, review_cycle_days, revision, is_controlled,
              last_review_date, review_count
       FROM plugin_document_lifecycle WHERE entry_id = ANY($1::int[])`,
      [entryIds],
    );
    const map = new Map<number, Record<string, unknown>>();
    for (const r of rows) map.set(r.entry_id as number, r);
    return map;
  } catch {
    // Plugin not installed or table doesn't exist — skip silently
    return new Map();
  }
}

function buildLLMMessages(
  systemPrompt: string,
  query: string,
  sources: RagSource[],
  pluginMetadata?: Map<number, Record<string, unknown>>,
): Array<{ role: string; content: string }> {
  const contextBlock = sources
    .map((s, i) => {
      let header = `[${i + 1}] Entry #${s.entryId} - "${s.title}" (${s.similarity}% match)`;
      const meta = pluginMetadata?.get(s.entryId);
      if (meta) {
        const parts: string[] = [];
        if (meta.document_number) parts.push(`Doc#: ${meta.document_number}`);
        if (meta.document_level) parts.push(`Level: ${meta.document_level}`);
        if (meta.status) parts.push(`Status: ${meta.status}`);
        if (meta.revision) parts.push(`Rev: ${meta.revision}`);
        if (meta.effective_date) parts.push(`Effective: ${String(meta.effective_date).slice(0, 10)}`);
        if (meta.review_due_date) parts.push(`Review Due: ${String(meta.review_due_date).slice(0, 10)}`);
        if (meta.is_controlled) parts.push("Controlled: Yes");
        if (parts.length > 0) header += `\n[Doc: ${parts.join(" | ")}]`;
      }
      return `${header}\n${s.chunkText}`;
    })
    .join("\n\n---\n\n");

  // Augment system prompt if managed documents are present
  let finalPrompt = systemPrompt;
  if (pluginMetadata && pluginMetadata.size > 0) {
    finalPrompt += `\n\nSome documents are plugin-managed with metadata (document number, level, status, revision, effective date, review due date). When answering about document versions, SOPs, or compliance:\n- Reference the document number (e.g. QP-001) and revision\n- Note the document status (draft/in_review/approved/published/obsolete)\n- Mention effective dates and review schedules when relevant\n- Distinguish between controlled and uncontrolled documents\n- For "latest version" questions, prioritize published status with the most recent effective date`;
  }

  return [
    { role: "system", content: finalPrompt },
    {
      role: "user",
      content: `Context from knowledge base:\n\n${contextBlock}\n\n---\n\nQuestion: ${query}`,
    },
  ];
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check feature permission
  const featurePerms = await getUserFeaturePermissions(principal.id, principal.isAdmin);
  if (!featurePerms.canUseRag) {
    return NextResponse.json({ error: "Forbidden: RAG access not granted" }, { status: 403 });
  }

  const ragConfig = await getSetting<RagConfig>("rag", DEFAULT_RAG);

  if (ragConfig.provider === "disabled") {
    return NextResponse.json({ error: "RAG is disabled" }, { status: 400 });
  }

  const body = await request.json();
  const { query, topK, filters } = body as {
    query: string;
    topK?: number;
    filters?: { type?: string; status?: string; tags?: string[]; collectionId?: number };
  };

  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const effectiveTopK = topK ?? ragConfig.topK ?? 5;

  // Get accessible collection IDs for non-admin users
  const accessibleCollectionIds = await getAccessibleCollectionIds(principal.id, principal.isAdmin);

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    return NextResponse.json(
      { error: "Failed to generate query embedding. Check embedding settings." },
      { status: 500 },
    );
  }

  // 2. Retrieve similar chunks
  const sources = await retrieveChunks(queryEmbedding, effectiveTopK, filters || {}, accessibleCollectionIds);
  if (sources.length === 0) {
    return NextResponse.json({ error: "No relevant entries found" }, { status: 404 });
  }

  // 2.5. Enrich with plugin metadata if available
  const pluginMetadata = await enrichWithPluginMetadata(sources);

  // 3. Build LLM prompt
  const messages = buildLLMMessages(ragConfig.systemPrompt, query, sources, pluginMetadata);

  // 4. Determine streaming mode
  const url = new URL(request.url);
  const stream = url.searchParams.get("stream") !== "false";

  // 5. Build LLM API URL
  let llmBaseUrl = ragConfig.baseUrl;
  if (ragConfig.provider === "ollama") {
    // Ollama uses a different path
    llmBaseUrl = llmBaseUrl.replace(/\/v1\/?$/, "");
  }
  const chatUrl =
    ragConfig.provider === "ollama" ? `${llmBaseUrl}/api/chat` : `${llmBaseUrl.replace(/\/$/, "")}/chat/completions`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ragConfig.apiKey) {
    headers["Authorization"] = `Bearer ${ragConfig.apiKey}`;
  }

  const llmBody =
    ragConfig.provider === "ollama"
      ? { model: ragConfig.model, messages, stream, options: { num_predict: ragConfig.maxTokens } }
      : {
          model: ragConfig.model,
          messages,
          stream,
          max_tokens: ragConfig.maxTokens,
          // Disable thinking/reasoning for RAG — we want content in the content field
          ...(ragConfig.provider === "spark-vllm" && { chat_template_kwargs: { enable_thinking: false } }),
        };

  if (!stream) {
    // Non-streaming mode
    try {
      const llmRes = await fetch(chatUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(llmBody),
      });
      if (!llmRes.ok) {
        const errText = await llmRes.text();
        console.error("LLM error:", llmRes.status, errText);
        return NextResponse.json({ error: "LLM request failed" }, { status: 502 });
      }
      const data = await llmRes.json();
      const answer =
        ragConfig.provider === "ollama" ? (data.message?.content ?? "") : (data.choices?.[0]?.message?.content ?? "");
      return NextResponse.json({ answer, sources });
    } catch (err) {
      console.error("LLM request failed:", err);
      return NextResponse.json({ error: "LLM request failed" }, { status: 502 });
    }
  }

  // Streaming mode — SSE
  try {
    const llmRes = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(llmBody),
    });

    if (!llmRes.ok || !llmRes.body) {
      const errText = await llmRes.text().catch(() => "");
      console.error("LLM stream error:", llmRes.status, errText);
      return NextResponse.json({ error: "LLM request failed" }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readable = new ReadableStream({
      async start(controller) {
        // Send sources first
        controller.enqueue(encoder.encode(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`));

        const reader = llmRes.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (ragConfig.provider === "ollama") {
                // Ollama streams JSON objects, one per line
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  const obj = JSON.parse(trimmed);
                  const token = obj.message?.content ?? "";
                  if (token) {
                    controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify(token)}\n\n`));
                  }
                  if (obj.done) break;
                } catch {
                  // skip unparseable lines
                }
              } else {
                // OpenAI-compatible SSE format
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") break;
                try {
                  const obj = JSON.parse(data);
                  const token = obj.choices?.[0]?.delta?.content ?? "";
                  if (token) {
                    controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify(token)}\n\n`));
                  }
                } catch {
                  // skip unparseable
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream read error:", err);
        } finally {
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("LLM streaming failed:", err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 502 });
  }
}
