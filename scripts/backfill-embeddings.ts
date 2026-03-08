import pg from "pg";

const DB_URL = process.env.DATABASE_URL ?? "postgresql://localhost:5432/clawkb";
const OLLAMA_URL = process.env.EMBEDDING_URL ?? process.env.OLLAMA_URL ?? "http://localhost:11434";
const DELAY_MS = 100;

async function generateEmbedding(text: string): Promise<number[] | null> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "bge-m3", input: [text] }),
  });
  if (!res.ok) throw new Error(`Ollama: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.embeddings?.[0] ?? null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const pool = new pg.Pool({ connectionString: DB_URL });

  const { rows: entries } = await pool.query(
    `SELECT id, title, summary, content FROM "Entry" WHERE embedding IS NULL ORDER BY id`
  );

  console.log(`Found ${entries.length} entries without embeddings.\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const text = [entry.title, entry.summary, entry.content].filter(Boolean).join("\n\n");
    const progress = `[${i + 1}/${entries.length}]`;

    try {
      const embedding = await generateEmbedding(text);
      if (embedding) {
        const vectorStr = `[${embedding.join(",")}]`;
        await pool.query(`UPDATE "Entry" SET embedding = $1::vector(1024) WHERE id = $2`, [vectorStr, entry.id]);
        console.log(`${progress} ✓ id=${entry.id} "${entry.title.slice(0, 50)}"`);
        success++;
      } else {
        console.log(`${progress} ✗ id=${entry.id} no embedding returned`);
        failed++;
      }
    } catch (err) {
      console.log(`${progress} ✗ id=${entry.id} error: ${(err as Error).message}`);
      failed++;
    }

    if (i < entries.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${success} success, ${failed} failed out of ${entries.length} total.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
