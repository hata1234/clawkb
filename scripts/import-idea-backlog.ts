import * as fs from "fs";
import pg from "pg";
import { generateEmbedding } from "../src/lib/embedding";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/clawkb" });
const FILE = process.env.IDEA_BACKLOG_FILE ?? "./data/idea-backlog.md";

async function main() {
  const raw = fs.readFileSync(FILE, "utf-8");
  // Split by ### headers
  const sections = raw.split(/^### /m).filter(s => s.trim().length > 10);
  
  let success = 0, skip = 0;
  for (const section of sections) {
    const lines = section.split("\n");
    const title = lines[0].trim();
    if (!title || title.length < 3) continue;
    
    const content = "### " + section.trim();
    const summary = lines.slice(1, 4).filter(l => l.trim()).join(" ").slice(0, 300) || title;

    const existing = await pool.query(`SELECT id FROM "Entry" WHERE source='idea-backlog' AND title=$1`, [title]);
    if (existing.rows.length > 0) { skip++; continue; }

    const text = [title, summary, content].join("\n\n");
    const embedding = await generateEmbedding(text);
    const vectorStr = embedding ? `[${embedding.join(",")}]` : null;

    await pool.query(
      `INSERT INTO "Entry" (type, source, title, summary, content, status, metadata, embedding, tsv, "createdAt", "updatedAt")
       VALUES ('project_note', 'idea-backlog', $1, $2, $3, 'new', '{}', $4::vector(1024), to_tsvector('simple', $1 || ' ' || $2), NOW(), NOW())`,
      [title, summary, content, vectorStr]
    );
    console.log(`✅ ${title.slice(0, 60)}`);
    success++;
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`\n完成：匯入 ${success} 筆，跳過 ${skip} 筆`);
  await pool.end();
}
main().catch(console.error);
