import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getStatusDefinitions } from "@/lib/plugins/manager";
import { getAllSettings } from "@/lib/settings";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get plugin-registered statuses (includes built-in defaults)
  const pluginStatuses = await getStatusDefinitions(principal);

  // Merge with settings-based custom statuses (settings take priority for label overrides)
  const settings = await getAllSettings();
  const settingsStatuses = (settings.status_options ?? []) as Array<{ id: string; label: string }>;
  const settingsMap = new Map(settingsStatuses.map((s) => [s.id, s]));

  // Merge: settings can override labels, plugin statuses provide colors/transitions
  const merged = pluginStatuses.map((ps) => {
    const ss = settingsMap.get(ps.key);
    return ss ? { ...ps, label: ss.label } : ps;
  });

  // Add any settings statuses not in plugins
  for (const ss of settingsStatuses) {
    if (!merged.find((m) => m.key === ss.id)) {
      merged.push({ key: ss.id, label: ss.label, color: "#71717a" });
    }
  }

  return NextResponse.json({ statuses: merged });
}
