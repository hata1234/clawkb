import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { listPlugins } from "@/lib/plugins/manager";
import { getMigrationStatus } from "@/lib/plugins/migrator";

/**
 * GET /api/plugins/migrations — List migration status for all plugins (admin only)
 */
export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.isAdmin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const plugins = await listPlugins();
  const result: Record<string, Awaited<ReturnType<typeof getMigrationStatus>>> = {};

  for (const plugin of plugins) {
    const status = await getMigrationStatus(plugin.manifest.id, plugin.dir);
    if (status.length > 0) {
      result[plugin.manifest.id] = status;
    }
  }

  return NextResponse.json({ migrations: result });
}
