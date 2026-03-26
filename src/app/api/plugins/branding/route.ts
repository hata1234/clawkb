import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getBranding } from "@/lib/plugins/manager";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  // Branding is available even to unauthenticated users (for login page, etc.)
  const branding = await getBranding(principal);
  return NextResponse.json(branding);
}
