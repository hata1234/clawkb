import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = principal.id;
  let lastCount = -1;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      }

      // Send initial count
      const initialCount = await getUnreadCount(userId);
      lastCount = initialCount;
      send(JSON.stringify({ type: "count", count: initialCount }));

      // Poll every 5 seconds
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          const count = await getUnreadCount(userId);
          if (count !== lastCount) {
            lastCount = count;

            // Fetch latest notification if count increased
            let latest = null;
            if (count > 0) {
              latest = await prisma.notification.findFirst({
                where: { userId, read: false },
                orderBy: { createdAt: "desc" },
              });
            }

            send(JSON.stringify({ type: "count", count, latest }));
          }
        } catch {
          // Silently continue
        }
      }, 5000);

      // Handle abort
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
