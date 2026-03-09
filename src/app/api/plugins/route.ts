import { NextResponse } from "next/server";
import { canManageSettings, getRequestPrincipal } from "@/lib/auth";
import { getSettingsPanels, listPlugins, setPluginEnabled, installPlugin, removePlugin } from "@/lib/plugins/manager";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [plugins, panels] = await Promise.all([
    listPlugins(),
    getSettingsPanels(principal),
  ]);

  return NextResponse.json({
    plugins: plugins.map((plugin) => ({
      ...plugin.manifest,
      enabled: plugin.enabled,
      apiBasePath: `/api/plugins/${plugin.manifest.id}`,
    })),
    panels,
  });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageSettings(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const manifest = await installPlugin(body);
  return NextResponse.json({ plugin: manifest }, { status: 201 });
}

export async function PATCH(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageSettings(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  await setPluginEnabled(String(body.pluginId), Boolean(body.enabled));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageSettings(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  await removePlugin(String(body.pluginId));
  return NextResponse.json({ ok: true });
}
