import { NextRequest, NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const principal = await getRequestPrincipal(req);
  if (!principal?.isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider, baseUrl, apiKey } = await req.json();
    const base = (baseUrl || "").replace(/\/$/, "");

    const testUrl =
      provider === "ollama"
        ? `${base.replace(/\/v1\/?$/, "")}/api/tags`
        : `${base}/models`;

    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(8000) });

    if (res.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({
      ok: false,
      status: res.status,
      statusText: res.statusText,
      error: `HTTP ${res.status} ${res.statusText}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ ok: false, error: msg });
  }
}
