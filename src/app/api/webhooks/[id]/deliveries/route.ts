import { NextResponse } from "next/server";
import { canManageSettings, getRequestPrincipal, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const webhookId = parseInt(id);

  const existing = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!existing) return jsonError("Not found", 404);

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    deliveries.map((d) => ({
      id: d.id,
      event: d.event,
      status: d.status,
      response: d.response,
      attempts: d.attempts,
      createdAt: d.createdAt.toISOString(),
    })),
  );
}
