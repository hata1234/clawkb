import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getStatusDefinitions } from "@/lib/plugins/manager";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statuses = await getStatusDefinitions(principal);
  return NextResponse.json({ statuses });
}
