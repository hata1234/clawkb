import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await getUnreadCount(principal.id);
  return NextResponse.json({ count });
}
