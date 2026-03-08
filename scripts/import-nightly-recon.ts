import pg from "pg";
import fs from "fs";

const DB_URL = process.env.DATABASE_URL ?? "postgresql://hata1234@localhost:5432/knowledge_hub";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://192.168.0.85:11434";
const RECON_FILE = process.env.RECON_FILE ?? "/Users/hata1234/clawd/memory/nightly-recon-log.md";
const DELAY_MS = 100;

interface ReconEntry {
  date: string;
  scanScope: string;
  discoveryCount: string;
  reported: string;
  filtered: string[];
  raw: string;
}

function parseReconLog(content: string): ReconEntry[] {
  const entries: ReconEntry[] = [];
  const sections = content.split(/^## /m).filter((s) => s.trim());

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const dateLine = lines[0].trim();

    // Skip non-date headers (e.g., the title "深夜偵察日誌")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateLine)) continue;

    const date = dateLine;
    let scanScope = "";
    let discoveryCount = "";
    let reported = "";
    const filtered: string[] = [];
    let inFiltered = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("- 掃描範圍：")) {
        scanScope = line.replace("- 掃描範圍：", "").trim();
        inFiltered = false;
      } else if (line.startsWith("- 發現數量：")) {
        discoveryCount = line.replace("- 發現數量：", "").trim();
        inFiltered = false;
      } else if (line.startsWith("- 已報告：")) {
        reported = line.replace("- 已報告：", "").trim();
        inFiltered = false;
      } else if (line.startsWith("- 已過濾")) {
        inFiltered = true;
      } else if (inFiltered && line.trim().startsWith("- ")) {
        filtered.push(line.trim().replace(/^- /, ""));
      }
    }

    const raw = lines.join("\n");
    entries.push({ date, scanScope, discoveryCount, reported, filtered, raw });
  }

  return entries;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "bge-m3", input: [text] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embeddings?.[0] ?? null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const pool = new pg.Pool({ connectionString: DB_URL });
  const content = fs.readFileSync(RECON_FILE, "utf-8");
  const entries = parseReconLog(content);

  console.log(`Parsed ${entries.length} nightly-recon entries.\n`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const title = `深夜偵察報告 ${entry.date}`;
    const progress = `[${i + 1}/${entries.length}]`;

    // Check if already imported
    const { rows: existing } = await pool.query(
      `SELECT id FROM "Entry" WHERE title = $1 AND source = 'nightly-recon'`,
      [title]
    );

    if (existing.length > 0) {
      console.log(`${progress} ⊘ "${title}" already exists (id=${existing[0].id}), skipping`);
      skipped++;
      continue;
    }

    const summary = `發現 ${entry.discoveryCount} 項機會。已報告：${entry.reported}`;
    const contentMd = [
      `## 掃描範圍\n${entry.scanScope}`,
      `## 發現數量\n${entry.discoveryCount}`,
      `## 已報告\n${entry.reported}`,
      entry.filtered.length > 0 ? `## 已過濾\n${entry.filtered.map((f) => `- ${f}`).join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Insert entry
    const { rows } = await pool.query(
      `INSERT INTO "Entry" (type, source, title, summary, content, status, metadata, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        "report",
        "nightly-recon",
        title,
        summary,
        contentMd,
        "done",
        JSON.stringify({ scanScope: entry.scanScope, discoveryCount: entry.discoveryCount }),
        `${entry.date}T23:00:00.000Z`,
        `${entry.date}T23:00:00.000Z`,
      ]
    );

    const entryId = rows[0].id;
    console.log(`${progress} ✓ Created id=${entryId} "${title}"`);

    // Generate and store embedding
    const embeddingText = [title, summary, contentMd].join("\n\n");
    const embedding = await generateEmbedding(embeddingText);
    if (embedding) {
      const vectorStr = `[${embedding.join(",")}]`;
      await pool.query(`UPDATE "Entry" SET embedding = $1::vector(1024) WHERE id = $2`, [vectorStr, entryId]);
      console.log(`  ↳ embedding stored`);
    } else {
      console.log(`  ↳ embedding skipped (Ollama unavailable)`);
    }

    created++;
    if (i < entries.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
