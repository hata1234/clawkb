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

async function generateEmbeddingOpenAI(text: string, apiKey: string, model: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
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
    return generateEmbeddingOpenAI(text, key, model);
  }

  // default: ollama
  const url = config.ollamaUrl ?? DEFAULT_EMBEDDING.ollamaUrl;
  const model = config.ollamaModel ?? DEFAULT_EMBEDDING.ollamaModel;
  return generateEmbeddingOllama(text, url, model);
}

export function buildEmbeddingInput(entry: { title: string; summary?: string | null; content?: string | null }): string {
  return [entry.title, entry.summary, entry.content].filter(Boolean).join("\n\n");
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
