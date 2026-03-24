import { NextResponse } from "next/server";
import { getRequestPrincipal, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWebhookSecret } from "@/lib/webhooks";
import { getUserFeaturePermissions } from "@/lib/permissions";

const VALID_EVENTS = ["entry.created", "entry.updated", "entry.deleted", "entry.restored", "comment.created"];

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  const featurePerms = await getUserFeaturePermissions(principal.id, principal.isAdmin);
  if (!featurePerms.canManageWebhooks) return jsonError("Forbidden", 403);

  const webhooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(
    webhooks.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      events: JSON.parse(w.events),
      active: w.active,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);
  const featurePerms2 = await getUserFeaturePermissions(principal.id, principal.isAdmin);
  if (!featurePerms2.canManageWebhooks) return jsonError("Forbidden", 403);

  const body = await request.json();
  const { name, url, secret, events } = body as {
    name?: string;
    url?: string;
    secret?: string;
    events?: string[];
  };

  if (!url) return jsonError("url is required", 400);
  if (!events || !Array.isArray(events) || events.length === 0) {
    return jsonError("events must be a non-empty array", 400);
  }
  const invalid = events.filter((e) => !VALID_EVENTS.includes(e));
  if (invalid.length > 0) return jsonError(`Invalid events: ${invalid.join(", ")}`, 400);

  const webhookSecret = secret || generateWebhookSecret();

  const webhook = await prisma.webhook.create({
    data: {
      name: name || "",
      url,
      secret: webhookSecret,
      events: JSON.stringify(events),
    },
  });

  return NextResponse.json(
    {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secret: webhookSecret,
      events: JSON.parse(webhook.events),
      active: webhook.active,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
