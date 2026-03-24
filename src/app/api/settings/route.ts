import { NextRequest, NextResponse } from "next/server";
import { getRequestPrincipal, canManageSettings, jsonError } from "@/lib/auth";
import { getAllSettings, setSetting } from "@/lib/settings";
import type { SmtpConfig } from "@/lib/settings";

/** Redact sensitive fields for non-admin users */
function redactSettings(settings: Record<string, unknown>, isAdmin: boolean) {
  if (isAdmin) return settings;
  const redacted = { ...settings };
  // Redact SMTP password
  if (redacted.smtp && typeof redacted.smtp === "object") {
    redacted.smtp = { ...(redacted.smtp as SmtpConfig), pass: "********" };
  }
  // Redact storage credentials
  if (redacted.storage && typeof redacted.storage === "object") {
    const s = { ...(redacted.storage as Record<string, unknown>) };
    if (s.secretKey) s.secretKey = "********";
    redacted.storage = s;
  }
  return redacted;
}

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden: admin only", 403);

  const settings = await getAllSettings();
  return NextResponse.json(redactSettings(settings as unknown as Record<string, unknown>, principal.isAdmin));
}

export async function PATCH(request: NextRequest) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden: admin only", 403);

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
