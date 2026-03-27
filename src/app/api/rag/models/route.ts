import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";

/**
 * GET /api/rag/models?baseUrl=...&apiKey=...&provider=...
 * Proxy to fetch available models from the configured LLM endpoint.
 */
export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const baseUrl = url.searchParams.get("baseUrl")?.replace(/\/$/, "") || "";
  const apiKey = url.searchParams.get("apiKey") || "";
  const provider = url.searchParams.get("provider") || "openai";

  if (!baseUrl) {
    return NextResponse.json({ error: "baseUrl required" }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    let modelsUrl: string;
    if (provider === "ollama") {
      modelsUrl = `${baseUrl.replace(/\/v1\/?$/, "")}/api/tags`;
    } else {
      // OpenAI-compatible (openai, openclaw, vllm, etc.)
      modelsUrl = `${baseUrl}/models`;
    }

    const res = await fetch(modelsUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch models: ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    // Normalize to a simple list of { id, name }
    let models: Array<{ id: string; name: string }> = [];

    if (provider === "ollama") {
      // Ollama returns { models: [{ name, ... }] }
      models = (data.models || []).map((m: { name: string }) => ({
        id: m.name,
        name: m.name,
      }));
    } else {
      // OpenAI-compatible returns { data: [{ id, ... }] }
      models = (data.data || []).map((m: { id: string; owned_by?: string }) => ({
        id: m.id,
        name: m.owned_by ? `${m.id} (${m.owned_by})` : m.id,
      }));
    }

    // Sort alphabetically
    models.sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch models: ${message}` }, { status: 502 });
  }
}
