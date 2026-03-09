import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getSidebarItems } from "@/lib/plugins/manager";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getSidebarItems(principal);
  return NextResponse.json({ items });
}
