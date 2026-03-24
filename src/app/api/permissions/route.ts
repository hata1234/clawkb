import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getUserFeaturePermissions } from "@/lib/permissions";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json(
      { canCreateCollections: false, canUseRag: false, canExport: false, canManageWebhooks: false },
      { status: 200 },
    );
  }

  const perms = await getUserFeaturePermissions(principal.id, principal.isAdmin);
  return NextResponse.json(perms);
}
