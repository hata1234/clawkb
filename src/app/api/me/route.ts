import { NextResponse } from "next/server";
import { getSessionPrincipal } from "@/lib/auth";

export async function GET() {
  const principal = await getSessionPrincipal();
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user: principal });
}
