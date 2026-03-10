/**
 * Rebuild all entry embeddings using the configured embedding provider.
 * Usage: npx tsx scripts/rebuild-embeddings.ts [--force]
 *   --force: re-embed entries that already have embeddings
 *   default: only embed entries with NULL embeddings
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
}

async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  const res = await pool.query(`SELECT value FROM "Setting" WHERE key = 'embedding'`);
  if (res.rows[0]) {
    const val = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value;
    return {
      provider: val.provider || "ollama",
      ollamaUrl: val.ollamaUrl || "http://localhost:11434",
      ollamaModel: val.ollamaModel || "bge-m3",
    };
  }
  return { provider: "ollama", ollamaUrl: "http://localhost:11434", ollamaModel: "bge-m3" };
}

async function embed(text: string, config: EmbeddingConfig): Promise<number[] | null> {
  const res = await fetch(`${config.ollamaUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.ollamaModel, input: [text] }),
  });
  if (!res.ok) {
    console.error(`  Ollama error: ${res.status} ${res.statusText}`);
    return null;
  }
  const data = await res.json();
  return data.embeddings?.[0] ?? null;
}

async function main() {
  const config = await getEmbeddingConfig();
  console.log(`Embedding config: ${config.provider} @ ${config.ollamaUrl} model=${config.ollamaModel}`);
  console.log(`Mode: ${force ? "FORCE (re-embed all)" : "only NULL embeddings"}`);

  // Test connection
  const testEmb = await embed("test", config);
  if (!testEmb) {
    console.error("Failed to connect to embedding provider. Aborting.");
    process.exit(1);
  }
  console.log(`Embedding dimension: ${testEmb.length}\n`);

  const whereClause = force ? "" : `WHERE embedding IS NULL`;
  const entries = await pool.query(
    `SELECT id, title, summary, content FROM "Entry" ${whereClause} ORDER BY id`
  );

  console.log(`Found ${entries.rows.length} entries to embed.\n`);

  let success = 0;
  let failed = 0;

  for (const entry of entries.rows) {
    const text = [entry.title, entry.summary, entry.content].filter(Boolean).join("\n\n");
    process.stdout.write(`  #${entry.id} ${entry.title.slice(0, 50)}... `);

    const embedding = await embed(text, config);
    if (embedding) {
      const vectorStr = `[${embedding.join(",")}]`;
      await pool.query(
        `UPDATE "Entry" SET embedding = $1::vector(1024) WHERE id = $2`,
        [vectorStr, entry.id]
      );
      process.stdout.write(`✅ (${embedding.length}d)\n`);
      success++;
    } else {
      process.stdout.write(`❌\n`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed, ${entries.rows.length} total`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
