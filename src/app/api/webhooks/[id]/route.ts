import { NextResponse } from "next/server";
import { canManageSettings, getRequestPrincipal, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_EVENTS = ["entry.created", "entry.updated", "entry.deleted", "entry.restored", "comment.created"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const webhookId = parseInt(id);

  const existing = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!existing) return jsonError("Not found", 404);

  const body = await request.json();
  const { name, url, events, active } = body as {
    name?: string;
    url?: string;
    events?: string[];
    active?: boolean;
  };

  if (events !== undefined) {
    if (!Array.isArray(events) || events.length === 0) {
      return jsonError("events must be a non-empty array", 400);
    }
    const invalid = events.filter((e) => !VALID_EVENTS.includes(e));
    if (invalid.length > 0) return jsonError(`Invalid events: ${invalid.join(", ")}`, 400);
  }

  const webhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      ...(name !== undefined && { name }),
      ...(url !== undefined && { url }),
      ...(events !== undefined && { events: JSON.stringify(events) }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json({
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    events: JSON.parse(webhook.events),
    active: webhook.active,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  if (!canManageSettings(principal)) return jsonError("Forbidden", 403);

  const { id } = await params;
  const webhookId = parseInt(id);

  const existing = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!existing) return jsonError("Not found", 404);

  await prisma.webhookDelivery.deleteMany({ where: { webhookId } });
  await prisma.webhook.delete({ where: { id: webhookId } });

  return NextResponse.json({ success: true });
}
