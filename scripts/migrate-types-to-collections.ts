/**
 * Migrate Entry.type values to Collections.
 * For each unique type, find or create a Collection, then add entries to it.
 *
 * Usage: DATABASE_URL="postgresql://..." npx tsx scripts/migrate-types-to-collections.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DB_URL = process.env.DATABASE_URL ?? "postgresql://localhost:5432/knowledge_hub";
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

const TYPE_LABELS: Record<string, string> = {
  opportunity: "Opportunities",
  report: "Reports",
  reference: "References",
  project_note: "Project Notes",
  entry: "General",
};

async function main() {
  console.log("Migrating Entry types to Collections...\n");

  // Get distinct types
  const types = await prisma.entry.groupBy({ by: ["type"] });
  console.log(`Found ${types.length} distinct type(s): ${types.map((t) => t.type).join(", ")}\n`);

  let totalMigrated = 0;

  for (const { type } of types) {
    const collectionName = TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // Find or create collection
    let collection = await prisma.collection.findFirst({ where: { name: collectionName, parentId: null } });
    if (!collection) {
      collection = await prisma.collection.create({
        data: { name: collectionName, description: `Auto-created from type: ${type}` },
      });
      console.log(`  [created] Collection "${collectionName}" (id=${collection.id})`);
    } else {
      console.log(`  [exists] Collection "${collectionName}" (id=${collection.id})`);
    }

    // Find entries of this type not yet in this collection
    const entries = await prisma.entry.findMany({
      where: {
        type,
        NOT: { collections: { some: { id: collection.id } } },
      },
      select: { id: true },
    });

    if (entries.length > 0) {
      await prisma.collection.update({
        where: { id: collection.id },
        data: { entries: { connect: entries.map((e) => ({ id: e.id })) } },
      });
      console.log(`  [migrated] ${entries.length} entries of type "${type}" → "${collectionName}"`);
      totalMigrated += entries.length;
    } else {
      console.log(`  [skip] All entries of type "${type}" already in "${collectionName}"`);
    }
  }

  console.log(`\nDone! Migrated ${totalMigrated} entries total.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
