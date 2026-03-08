import { pool } from "./prisma";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://192.168.0.85:11434";
const EMBED_MODEL = "bge-m3";

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: [text] }),
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
