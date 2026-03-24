import { NextRequest, NextResponse } from "next/server";
import { getRequestPrincipal, canManageSettings, jsonError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden: admin only", 403);

  const { provider, ollamaUrl, ollamaModel, openaiApiKey, openaiModel } = await request.json();

  try {
    if (provider === "ollama") {
      const url = ollamaUrl ?? "http://localhost:11434";
      const model = ollamaModel ?? "bge-m3";
      const res = await fetch(`${url}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: ["test"] }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
      const data = await res.json();
      const dim = data.embeddings?.[0]?.length ?? 0;
      return NextResponse.json({ ok: true, message: `Connected · ${model} · dim=${dim}` });
    }

    if (provider === "openai") {
      const model = openaiModel ?? "text-embedding-3-small";
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({ model, input: "test" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? `OpenAI returned ${res.status}`);
      }
      return NextResponse.json({ ok: true, message: `Connected · ${model}` });
    }

    return NextResponse.json({ ok: true, message: "Embedding disabled" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 200 });
  }
}
