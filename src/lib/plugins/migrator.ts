/**
 * Plugin Schema Migration System
 *
 * Convention:
 *   plugins/<id>/migrations/
 *     001_description.up.sql
 *     001_description.down.sql
 *     002_add_foo.up.sql
 *     002_add_foo.down.sql
 *
 * Tracks applied migrations in `plugin_migrations` table.
 * Runs pending .up.sql files in order on plugin load.
 */

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

interface AppliedMigration {
  plugin_id: string;
  version: string;
  filename: string;
  checksum: string | null;
  applied_at: Date;
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Scan a plugin's migrations/ directory and return sorted .up.sql files.
 */
function discoverMigrations(pluginDir: string): { version: string; filename: string; filePath: string }[] {
  const migDir = path.join(pluginDir, "migrations");
  if (!fs.existsSync(migDir)) return [];

  const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".up.sql")).sort();

  return files.map((f) => {
    // Extract version from filename: "001_initial.up.sql" → "001_initial"
    const version = f.replace(".up.sql", "");
    return { version, filename: f, filePath: path.join(migDir, f) };
  });
}

/**
 * Get already-applied migrations for a plugin.
 */
async function getApplied(pluginId: string): Promise<Map<string, AppliedMigration>> {
  try {
    const rows = await prisma.$queryRaw<AppliedMigration[]>`
      SELECT plugin_id, version, filename, checksum, applied_at
      FROM plugin_migrations
      WHERE plugin_id = ${pluginId}
      ORDER BY version ASC
    `;
    return new Map(rows.map((r) => [r.version, r]));
  } catch {
    // Table might not exist yet on very first run
    return new Map();
  }
}

/**
 * Run all pending migrations for a plugin.
 * Returns number of migrations applied.
 */
export async function runPluginMigrations(pluginId: string, pluginDir: string): Promise<number> {
  const migrations = discoverMigrations(pluginDir);
  if (migrations.length === 0) return 0;

  const applied = await getApplied(pluginId);
  let count = 0;

  for (const mig of migrations) {
    if (applied.has(mig.version)) {
      // Verify checksum hasn't changed (detect tampered migrations)
      const existing = applied.get(mig.version)!;
      const content = fs.readFileSync(mig.filePath, "utf-8");
      const checksum = sha256(content);
      if (existing.checksum && existing.checksum !== checksum) {
        console.warn(
          `[plugin-migrator] WARNING: Migration ${pluginId}/${mig.filename} checksum mismatch! ` +
            `Expected ${existing.checksum}, got ${checksum}. Skipping (already applied).`,
        );
      }
      continue;
    }

    // Run the migration
    const content = fs.readFileSync(mig.filePath, "utf-8");
    const checksum = sha256(content);

    console.log(`[plugin-migrator] Applying ${pluginId}/${mig.filename}...`);

    try {
      await prisma.$executeRawUnsafe(content);

      // Record as applied
      await prisma.$executeRaw`
        INSERT INTO plugin_migrations (plugin_id, version, filename, checksum)
        VALUES (${pluginId}, ${mig.version}, ${mig.filename}, ${checksum})
      `;

      console.log(`[plugin-migrator] ✅ ${pluginId}/${mig.filename} applied successfully`);
      count++;
    } catch (err) {
      console.error(`[plugin-migrator] ❌ Failed to apply ${pluginId}/${mig.filename}:`, err);
      throw err; // Stop on first failure
    }
  }

  return count;
}

/**
 * Rollback the last N migrations for a plugin.
 */
export async function rollbackPluginMigrations(
  pluginId: string,
  pluginDir: string,
  count: number = 1,
): Promise<number> {
  const applied = await getApplied(pluginId);
  const versions = Array.from(applied.keys()).sort().reverse();

  let rolled = 0;
  for (const version of versions.slice(0, count)) {
    const downFile = path.join(pluginDir, "migrations", `${version}.down.sql`);
    if (!fs.existsSync(downFile)) {
      console.error(`[plugin-migrator] No down.sql found for ${pluginId}/${version}`);
      break;
    }

    const content = fs.readFileSync(downFile, "utf-8");
    console.log(`[plugin-migrator] Rolling back ${pluginId}/${version}...`);

    try {
      await prisma.$executeRawUnsafe(content);
      await prisma.$executeRaw`
        DELETE FROM plugin_migrations WHERE plugin_id = ${pluginId} AND version = ${version}
      `;
      console.log(`[plugin-migrator] ✅ ${pluginId}/${version} rolled back`);
      rolled++;
    } catch (err) {
      console.error(`[plugin-migrator] ❌ Failed to rollback ${pluginId}/${version}:`, err);
      throw err;
    }
  }

  return rolled;
}

/**
 * List migration status for a plugin.
 */
export async function getMigrationStatus(
  pluginId: string,
  pluginDir: string,
): Promise<{ version: string; filename: string; applied: boolean; appliedAt?: Date }[]> {
  const migrations = discoverMigrations(pluginDir);
  const applied = await getApplied(pluginId);

  return migrations.map((m) => ({
    version: m.version,
    filename: m.filename,
    applied: applied.has(m.version),
    appliedAt: applied.get(m.version)?.applied_at,
  }));
}
