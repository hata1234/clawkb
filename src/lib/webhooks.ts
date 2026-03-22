import { createHmac } from "crypto";
import { prisma } from "./prisma";
import { dispatchNotification } from "./notifications";

export type WebhookEvent =
  | "entry.created"
  | "entry.updated"
  | "entry.deleted"
  | "entry.restored"
  | "comment.created";

const MAX_ATTEMPTS = 3;
const BACKOFF_BASE = 1000; // 1s, 4s, 16s

function signPayload(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverWebhook(
  webhookId: number,
  url: string,
  secret: string,
  event: WebhookEvent,
  body: string,
) {
  let lastStatus = 0;
  let lastResponse: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ClawKB-Event": event,
          "X-ClawKB-Signature": signPayload(body, secret),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      lastStatus = res.status;
      lastResponse = (await res.text()).slice(0, 1000);

      if (res.ok) {
        await prisma.webhookDelivery.create({
          data: { webhookId, event, payload: body, status: lastStatus, response: lastResponse, attempts: attempt },
        });
        return;
      }
    } catch (err) {
      lastStatus = 0;
      lastResponse = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFF_BASE * Math.pow(4, attempt - 1)));
    }
  }

  // Log final failure
  await prisma.webhookDelivery.create({
    data: { webhookId, event, payload: body, status: lastStatus, response: lastResponse, attempts: MAX_ATTEMPTS },
  }).catch(() => {});

  // Notify admins about webhook failure
  notifyAdminsWebhookFailure(webhookId, url, event).catch(() => {});
}

export function dispatchWebhookEvent(event: WebhookEvent, data: Record<string, unknown>) {
  // Fire-and-forget — never block the caller
  (async () => {
    try {
      const webhooks = await prisma.webhook.findMany({ where: { active: true } });
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data });

      const matching = webhooks.filter((w) => {
        try {
          const events = JSON.parse(w.events) as string[];
          return events.includes(event);
        } catch {
          return false;
        }
      });

      await Promise.allSettled(
        matching.map((w) => deliverWebhook(w.id, w.url, w.secret, event, body)),
      );
    } catch {
      // Silently fail — webhook errors must never affect main flows
    }
  })();
}

async function notifyAdminsWebhookFailure(webhookId: number, url: string, event: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin", approvalStatus: "approved" },
      select: { id: true },
    });
    for (const admin of admins) {
      dispatchNotification(admin.id, {
        type: "system",
        title: `Webhook delivery failed after ${MAX_ATTEMPTS} attempts`,
        body: `Webhook #${webhookId} (${url}) failed for event: ${event}`,
        link: "/settings/webhooks",
      }).catch(() => {});
    }
  } catch { /* silently fail */ }
}

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
