import * as fs from "fs";
import * as path from "path";
import pg from "pg";
import { generateEmbedding } from "../src/lib/embedding";

const pool = new pg.Pool({ connectionString: "postgresql://hata1234@localhost:5432/knowledge_hub" });

const DIR = "/Users/hata1234/clawd/reports/stock-daily";

async function main() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith(".json")).sort();
  
  // 同日取 telegram 優先
  const byDate: Record<string, string> = {};
  for (const f of files) {
    const date = f.split("_")[0];
    if (!byDate[date] || f.includes("telegram")) {
      byDate[date] = f;
    }
  }

  let success = 0, skip = 0;
  for (const [date, filename] of Object.entries(byDate)) {
    const existing = await pool.query(`SELECT id FROM "Entry" WHERE source='stock-daily' AND title=$1`, [`美股日報 ${date}`]);
    if (existing.rows.length > 0) { skip++; continue; }

    const raw = JSON.parse(fs.readFileSync(path.join(DIR, filename), "utf-8"));
    const categories = raw.categories || {};

    // Build markdown content
    let content = `# 美股日報 ${date}\n\n`;
    const spy = categories["指數"]?.find((s: any) => s.symbol === "SPY");
    const spyChange = spy ? `SPY ${spy.change_pct > 0 ? "+" : ""}${spy.change_pct.toFixed(2)}%` : "";

    for (const [cat, stocks] of Object.entries(categories) as [string, any[]][]) {
      content += `## ${cat}\n\n`;
      content += `| 代號 | 名稱 | 價格 | 漲跌 | 漲跌% |\n`;
      content += `|------|------|------|------|-------|\n`;
      for (const s of stocks) {
        const chg = s.change > 0 ? `+${s.change.toFixed(2)}` : s.change.toFixed(2);
        const pct = s.change_pct > 0 ? `+${s.change_pct.toFixed(2)}%` : `${s.change_pct.toFixed(2)}%`;
        content += `| ${s.symbol} | ${s.name} | $${s.price} | ${chg} | ${pct} |\n`;
      }
      content += "\n";
    }

    const summary = spyChange ? `大盤：${spyChange}。包含指數、AI、軍工、科技等類別。` : `美股日報，包含多個類別。`;
    const title = `美股日報 ${date}`;
    const text = [title, summary, content].join("\n\n");
    const embedding = await generateEmbedding(text);
    const vectorStr = embedding ? `[${embedding.join(",")}]` : null;
    const tsv = `to_tsvector('simple', $1 || ' ' || $2 || ' ' || $3)`;

    await pool.query(
      `INSERT INTO "Entry" (type, source, title, summary, content, status, metadata, embedding, tsv, "createdAt", "updatedAt")
       VALUES ('report', 'stock-daily', $1, $2, $3, 'new', $4, $5::vector(1024), to_tsvector('simple', $1 || ' ' || $2), NOW(), NOW())`,
      [title, summary, content, JSON.stringify({ date, filename }), vectorStr]
    );
    console.log(`✅ ${date} (${filename})`);
    success++;
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n完成：匯入 ${success} 筆，跳過 ${skip} 筆`);
  await pool.end();
}

main().catch(console.error);
