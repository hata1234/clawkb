import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getDashboardWidgets } from "@/lib/plugins/manager";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const widgets = await getDashboardWidgets(principal);
  return NextResponse.json({ widgets });
}
