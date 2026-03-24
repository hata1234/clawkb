// Backlinks plugin — tracks bidirectional links between entries
// Scans content for #<entryId> or /entries/<id> patterns and stores in a backlinks table

let initialized = false;

async function ensureTable(prisma) {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "entry_backlinks" (
      "id" SERIAL PRIMARY KEY,
      "source_entry_id" INTEGER NOT NULL,
      "target_entry_id" INTEGER NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE("source_entry_id", "target_entry_id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_backlinks_target" ON "entry_backlinks" ("target_entry_id")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_backlinks_source" ON "entry_backlinks" ("source_entry_id")
  `);
  initialized = true;
}

function extractLinkedIds(content) {
  if (!content) return [];
  const ids = new Set();

  // Match #<number> (e.g. #42)
  const hashPattern = /#(\d+)/g;
  let match;
  while ((match = hashPattern.exec(content)) !== null) {
    ids.add(parseInt(match[1], 10));
  }

  // Match /entries/<number>
  const pathPattern = /\/entries\/(\d+)/g;
  while ((match = pathPattern.exec(content)) !== null) {
    ids.add(parseInt(match[1], 10));
  }

  return [...ids];
}

async function updateBacklinks(entryId, content, prisma) {
  await ensureTable(prisma);

  const linkedIds = extractLinkedIds(content);

  // Remove old backlinks from this source
  await prisma.$executeRawUnsafe(`DELETE FROM "entry_backlinks" WHERE "source_entry_id" = $1`, entryId);

  // Insert new backlinks (skip self-references)
  for (const targetId of linkedIds) {
    if (targetId === entryId) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "entry_backlinks" ("source_entry_id", "target_entry_id")
       VALUES ($1, $2)
       ON CONFLICT ("source_entry_id", "target_entry_id") DO NOTHING`,
      entryId,
      targetId,
    );
  }
}

export const entry = {
  /**
   * @param {object} input
   * @param {Record<string, unknown>} input.entry
   * @param {import('../../src/lib/plugins/types').PluginContext} input.context
   */
  async afterCreate({ entry, context }) {
    const content = [entry.title, entry.summary, entry.content].filter(Boolean).join(" ");
    await updateBacklinks(entry.id, content, context.prisma);
  },

  /**
   * @param {object} input
   * @param {Record<string, unknown>} input.entry
   * @param {import('../../src/lib/plugins/types').PluginContext} input.context
   */
  async afterUpdate({ entry, context }) {
    const content = [entry.title, entry.summary, entry.content].filter(Boolean).join(" ");
    await updateBacklinks(entry.id, content, context.prisma);
  },

  /**
   * @param {object} input
   * @param {Record<string, unknown>} input.entry
   * @param {import('../../src/lib/plugins/types').PluginContext} input.context
   */
  async render({ entry, context }) {
    await ensureTable(context.prisma);

    const rows = await context.prisma.$queryRawUnsafe(
      `SELECT e."id", e."title"
       FROM "entry_backlinks" b
       JOIN "Entry" e ON e."id" = b."source_entry_id"
       WHERE b."target_entry_id" = $1
       AND e."deletedAt" IS NULL
       ORDER BY e."title"`,
      entry.id,
    );

    if (!rows || rows.length === 0) return;

    return [
      {
        id: "backlinks",
        type: "backlinks",
        title: "Backlinks",
        data: {
          entries: rows.map((r) => ({ id: r.id, title: r.title })),
        },
      },
    ];
  },
};
