import { pool } from "./prisma";
import { getSetting, DEFAULT_EMBEDDING, type EmbeddingConfig } from "./settings";

// ─── Embedding generation ──────────────────────────────────────────────────

async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  return getSetting<EmbeddingConfig>("embedding", DEFAULT_EMBEDDING);
}

async function generateEmbeddingOllama(text: string, ollamaUrl: string, model: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${ollamaUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: [text] }),
    });
    if (!res.ok) {
      console.error(`Ollama embed error: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return data.embeddings?.[0] ?? null;
  } catch (err) {
    console.error("Ollama embed failed:", err);
    return null;
  }
}

async function generateEmbeddingOpenAI(text: string, apiKey: string, model: string, baseUrl: string = "https://api.openai.com"): Promise<number[] | null> {
  try {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    });
    if (!res.ok) {
      console.error(`OpenAI embed error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.error("OpenAI embed failed:", err);
    return null;
  }
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const config = await getEmbeddingConfig();

  if (config.provider === "disabled") return null;

  if (config.provider === "openai") {
    const key = config.openaiApiKey ?? "";
    const model = config.openaiModel ?? "text-embedding-3-small";
    if (!key) { console.error("OpenAI embedding: no API key configured"); return null; }
    const baseUrl = config.openaiBaseUrl ?? "https://api.openai.com";
    return generateEmbeddingOpenAI(text, key, model, baseUrl);
  }

  // default: ollama
  const url = config.ollamaUrl ?? DEFAULT_EMBEDDING.ollamaUrl;
  const model = config.ollamaModel ?? DEFAULT_EMBEDDING.ollamaModel;
  return generateEmbeddingOllama(text, url, model);
}

export function buildEmbeddingInput(entry: { title: string; summary?: string | null; content?: string | null }): string {
  // Only title + summary for embedding — long content dilutes vector quality
  return [entry.title, entry.summary].filter(Boolean).join("\n\n");
}

export async function storeEmbedding(entryId: number, embedding: number[]): Promise<void> {
  const vectorStr = `[${embedding.join(",")}]`;
  await pool.query(`UPDATE "Entry" SET embedding = $1::vector(1024) WHERE id = $2`, [vectorStr, entryId]);
}

export async function generateAndStoreEmbedding(entry: { id: number; title: string; summary?: string | null; content?: string | null }): Promise<void> {
  try {
    const text = buildEmbeddingInput(entry);
    const embedding = await generateEmbedding(text);
    if (embedding) {
      await storeEmbedding(entry.id, embedding);
    }
  } catch (err) {
    console.error(`Failed to generate/store embedding for entry ${entry.id}:`, err);
  }
}

// ─── Chunking ──────────────────────────────────────────────────────────────

export function chunkContent(content: string, maxChars = 500, overlap = 50): string[] {
  if (!content || content.trim().length === 0) return [];

  // Split by double-newline paragraphs first
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= maxChars) {
      current = current ? current + "\n\n" + para : para;
    } else {
      if (current) chunks.push(current);
      // If a single paragraph exceeds maxChars, split by sentences
      if (para.length > maxChars) {
        const sentences = para.split(/(?<=[。！？.!?\n])\s*/);
        current = "";
        for (const sentence of sentences) {
          if (current.length + sentence.length + 1 <= maxChars) {
            current = current ? current + " " + sentence : sentence;
          } else {
            if (current) chunks.push(current);
            // If a single sentence exceeds max, hard-split
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

  // Apply overlap: prepend tail of previous chunk to current
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

export function buildChunkContextText(title: string, summary: string | null | undefined, chunkText: string): string {
  const prefix = [title, summary].filter(Boolean).join("\n");
  return `${prefix}\n---\n${chunkText}`;
}

export async function generateAndStoreChunks(entry: {
  id: number;
  title: string;
  summary?: string | null;
  content?: string | null;
}): Promise<{ totalChunks: number }> {
  // Delete existing chunks for this entry
  await pool.query(`DELETE FROM entry_chunks WHERE entry_id = $1`, [entry.id]);

  // Chunk 0: title + summary (backward compat with Entry.embedding)
  const chunk0Text = buildEmbeddingInput(entry);
  const chunk0Embedding = await generateEmbedding(chunk0Text);

  // Store chunk 0 in Entry.embedding for backward compat
  if (chunk0Embedding) {
    await storeEmbedding(entry.id, chunk0Embedding);
  }

  // Insert chunk 0 into entry_chunks
  if (chunk0Embedding) {
    const vectorStr = `[${chunk0Embedding.join(",")}]`;
    await pool.query(
      `INSERT INTO entry_chunks (entry_id, chunk_index, chunk_text, context_text, embedding)
       VALUES ($1, 0, $2, $2, $3::vector(1024))`,
      [entry.id, chunk0Text, vectorStr]
    );
  }

  // Content chunks (chunk 1+)
  const contentChunks = chunkContent(entry.content || "", 500, 50);
  let totalChunks = 1; // chunk 0

  for (let i = 0; i < contentChunks.length; i++) {
    const chunkText = contentChunks[i];
    const contextText = buildChunkContextText(entry.title, entry.summary, chunkText);
    const embedding = await generateEmbedding(contextText);

    if (embedding) {
      const vectorStr = `[${embedding.join(",")}]`;
      await pool.query(
        `INSERT INTO entry_chunks (entry_id, chunk_index, chunk_text, context_text, embedding)
         VALUES ($1, $2, $3, $4, $5::vector(1024))`,
        [entry.id, i + 1, chunkText, contextText, vectorStr]
      );
    } else {
      // Store without embedding
      await pool.query(
        `INSERT INTO entry_chunks (entry_id, chunk_index, chunk_text, context_text)
         VALUES ($1, $2, $3, $4)`,
        [entry.id, i + 1, chunkText, contextText]
      );
    }
    totalChunks++;
  }

  return { totalChunks };
}
