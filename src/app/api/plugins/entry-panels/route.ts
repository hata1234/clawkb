import { NextResponse } from "next/server";
import { getEntryPanels } from "@/lib/plugins/manager";
import { getRequestPrincipal } from "@/lib/auth";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  const panels = await getEntryPanels(principal);
  return NextResponse.json({ panels });
}
