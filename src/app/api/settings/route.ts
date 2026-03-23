import { NextRequest, NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { getAllSettings, setSetting } from "@/lib/settings";

export async function GET(request: Request) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getAllSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { key, value } = body as { key: string; value: unknown };

  const validKeys = [
    "entry_types",
    "source_options",
    "status_options",
    "embedding",
    "storage",
    "auth",
    "plugins",
    "rag",
    "smtp",
  ];
  if (!validKeys.includes(key)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  await setSetting(key, value);
  return NextResponse.json({ ok: true });
}
