import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (principal.effectiveRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const entryId = parseInt(id);

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!entry.deletedAt) return NextResponse.json({ error: "Entry is not deleted" }, { status: 400 });

  await prisma.entry.update({
    where: { id: entryId },
    data: { deletedAt: null, deletedBy: null },
  });

  logActivity("entry.restored", principal.id, entryId, { title: entry.title }).catch(() => {});
  dispatchWebhookEvent("entry.restored", { id: entryId, title: entry.title });

  return NextResponse.json({ success: true });
}
