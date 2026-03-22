import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { markAsRead } from "@/lib/notifications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await markAsRead(Number(id), principal.id);
  return NextResponse.json({ ok: true });
}
