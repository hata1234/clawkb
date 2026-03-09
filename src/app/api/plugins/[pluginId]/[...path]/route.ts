import { getRequestPrincipal } from "@/lib/auth";
import { executePluginApi } from "@/lib/plugins/manager";

async function handle(request: Request, { params }: { params: Promise<{ pluginId: string; path: string[] }> }) {
  const principal = await getRequestPrincipal(request);
  const { pluginId, path } = await params;
  return executePluginApi(pluginId, path, request, principal);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
