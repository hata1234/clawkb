import { NextRequest, NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getUserNotifications } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const notifications = await getUserNotifications(principal.id, { unreadOnly, limit, offset });
  return NextResponse.json({ notifications });
}
