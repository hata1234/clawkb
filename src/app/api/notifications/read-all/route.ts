import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { markAllAsRead } from "@/lib/notifications";

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markAllAsRead(principal.id);
  return NextResponse.json({ ok: true });
}
