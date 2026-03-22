/**
 * Reindex all entry embeddings using chunked storage (entry_chunks table).
 * Usage: npx tsx scripts/reindex-embeddings.ts [--force]
 *   --force: re-chunk all entries (deletes existing chunks)
 *   default: only process entries without chunks
 */

import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: DATABASE_URL });

const force = process.argv.includes("--force");

interface EmbeddingConfig {
  provider: string;
  ollamaUrl: string;
  ollamaModel: string;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl?: string;
}

async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  const res = await pool.query(`SELECT value FROM "Setting" WHERE key = 'embedding'`);
  if (res.rows[0]) {
    const val = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value;
    return {
      provider: val.provider || "ollama",
      ollamaUrl: val.ollamaUrl || "http://localhost:11434",
      ollamaModel: val.ollamaModel || "bge-m3",
      openaiApiKey: val.openaiApiKey,
      openaiModel: val.openaiModel,
      openaiBaseUrl: val.openaiBaseUrl,
    };
  }
  return { provider: "ollama", ollamaUrl: "http://localhost:11434", ollamaModel: "bge-m3" };
}

async function embed(text: string, config: EmbeddingConfig): Promise<number[] | null> {
  if (config.provider === "openai") {
    const baseUrl = config.openaiBaseUrl || "https://api.openai.com";
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey || ""}`,
      },
      body: JSON.stringify({ model: config.openaiModel || "text-embedding-3-small", input: text }),
    });
    if (!res.ok) { console.error(`  OpenAI error: ${res.status}`); return null; }
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  }
  // Default: ollama
  const res = await fetch(`${config.ollamaUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.ollamaModel, input: [text] }),
  });
  if (!res.ok) { console.error(`  Ollama error: ${res.status} ${res.statusText}`); return null; }
  const data = await res.json();
  return data.embeddings?.[0] ?? null;
}

function chunkContent(content: string, maxChars = 500, overlap = 50): string[] {
  if (!content || content.trim().length === 0) return [];
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= maxChars) {
      current = current ? current + "\n\n" + para : para;
    } else {
      if (current) chunks.push(current);
      if (para.length > maxChars) {
        const sentences = para.split(/(?<=[.!?\n])\s*/);
        current = "";
        for (const sentence of sentences) {
          if (current.length + sentence.length + 1 <= maxChars) {
            current = current ? current + " " + sentence : sentence;
          } else {
            if (current) chunks.push(current);
            if (sentence.length > maxChars) {
              for (let i = 0; i < sentence.length; i += maxChars - overlap) {
                chunks.push(sentence.slice(i, i + maxChars));
              }
              current = "";
            } else {
              current = sentence;
            }
          }
        }
      } else {
        current = para;
      }
    }
  }
  if (current) chunks.push(current);
  if (overlap > 0 && chunks.length > 1) {
    const overlapped: string[] = [chunks[0]];
    for (let i = 1; i < chunks.length; i++) {
      const prevTail = chunks[i - 1].slice(-overlap);
      overlapped.push(prevTail + " " + chunks[i]);
    }
    return overlapped;
  }
  return chunks;
}

async function processEntry(
  entry: { id: number; title: string; summary: string | null; content: string | null },
  config: EmbeddingConfig
): Promise<{ chunks: number; ok: boolean }> {
  // Delete existing chunks
  await pool.query(`DELETE FROM entry_chunks WHERE entry_id = $1`, [entry.id]);

  // Chunk 0: title + summary
  const chunk0Text = [entry.title, entry.summary].filter(Boolean).join("\n\n");
  const chunk0Emb = await embed(chunk0Text, config);

  if (chunk0Emb) {
    const vecStr = `[${chunk0Emb.join(",")}]`;
    await pool.query(`UPDATE "Entry" SET embedding = $1::vector(1024) WHERE id = $2`, [vecStr, entry.id]);
    await pool.query(
      `INSERT INTO entry_chunks (entry_id, chunk_index, chunk_text, context_text, embedding)
       VALUES ($1, 0, $2, $2, $3::vector(1024))`,
      [entry.id, chunk0Text, vecStr]
    );
  }

  // Content chunks
  const contentChunks = chunkContent(entry.content || "", 500, 50);
  let totalChunks = 1;

  for (let i = 0; i < contentChunks.length; i++) {
    const chunkText = contentChunks[i];
    const contextText = `${[entry.title, entry.summary].filter(Boolean).join("\n")}\n---\n${chunkText}`;
    const emb = await embed(contextText, config);
    if (emb) {
      const vecStr = `[${emb.join(",")}]`;
      await pool.query(
        `INSERT INTO entry_chunks (entry_id, chunk_index, chunk_text, context_text, embedding)
         VALUES ($1, $2, $3, $4, $5::vector(1024))`,
        [entry.id, i + 1, chunkText, contextText, vecStr]
      );
    } else {
      await pool.query(
        `INSERT INTO entry_chunks (entry_id, chunk_index, chunk_text, context_text)
         VALUES ($1, $2, $3, $4)`,
        [entry.id, i + 1, chunkText, contextText]
      );
    }
    totalChunks++;
  }

  return { chunks: totalChunks, ok: !!chunk0Emb };
}

async function main() {
  const config = await getEmbeddingConfig();
  console.log(`Embedding config: ${config.provider} @ ${config.ollamaUrl} model=${config.ollamaModel}`);
  console.log(`Mode: ${force ? "FORCE (re-chunk all)" : "only entries without chunks"}\n`);

  // Test connection
  const testEmb = await embed("test", config);
  if (!testEmb) {
    console.error("Failed to connect to embedding provider. Aborting.");
    process.exit(1);
  }
  console.log(`Embedding dimension: ${testEmb.length}\n`);

  let query: string;
  if (force) {
    query = `SELECT id, title, summary, content FROM "Entry" WHERE "deletedAt" IS NULL ORDER BY id`;
  } else {
    query = `SELECT e.id, e.title, e.summary, e.content FROM "Entry" e
             LEFT JOIN entry_chunks c ON c.entry_id = e.id
             WHERE e."deletedAt" IS NULL AND c.id IS NULL
             ORDER BY e.id`;
  }

  const { rows: entries } = await pool.query(query);
  console.log(`Found ${entries.length} entries to process.\n`);

  let success = 0;
  let failed = 0;

  for (const entry of entries) {
    process.stdout.write(`  #${entry.id} ${entry.title.slice(0, 50).padEnd(50)} `);
    const result = await processEntry(entry, config);
    if (result.ok) {
      process.stdout.write(`${result.chunks} chunks\n`);
      success++;
    } else {
      process.stdout.write(`FAILED\n`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed, ${entries.length} total`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
