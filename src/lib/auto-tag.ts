import { pool } from "./prisma";

const OLLAMA_URL = "http://192.168.0.85:11434";

export async function autoTagEntry(entryId: number, title: string, content: string, source: string): Promise<string[]> {
  try {
    // Get existing tags for context
    const { rows: existingTags } = await pool.query('SELECT name FROM "Tag" ORDER BY name');
    const tagList = existingTags.map((t: { name: string }) => t.name);

    const prompt = `You are a knowledge base auto-tagger. Given the following entry, suggest 2-5 relevant tags.

Existing tags in the system: ${tagList.join(", ") || "(none yet)"}

RULES:
- Prefer existing tags when they fit
- Create new tags only when necessary  
- Tags should be lowercase, kebab-case (e.g., "web-scraping", "crypto", "ai-agents")
- Return ONLY a JSON array of tag strings, nothing else

Entry:
Title: ${title}
Source: ${source}
Content: ${content.slice(0, 1000)}

Tags:`;

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:4b",
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const text = data.response?.trim() || "";

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    const tags: string[] = JSON.parse(match[0]);
    if (!Array.isArray(tags)) return [];

    // Apply tags to entry
    for (const tagName of tags.slice(0, 5)) {
      const name = tagName.toLowerCase().trim().replace(/\s+/g, "-");
      if (!name) continue;

      // Upsert tag
      const { rows: [tag] } = await pool.query(
        `INSERT INTO "Tag" (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [name]
      );

      // Link to entry (ignore if already linked)
      await pool.query(
        `INSERT INTO "_EntryTags" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [entryId, tag.id]
      );
    }

    return tags.slice(0, 5);
  } catch (e) {
    console.error("Auto-tag error:", e);
    return [];
  }
}
