import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      include: {
        actor: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activityLog.count(),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      action: item.action,
      entryId: item.entryId,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
      actor: item.actor
        ? {
            id: item.actor.id,
            username: item.actor.username,
            displayName: item.actor.displayName || item.actor.username,
            avatarUrl: item.actor.avatarUrl,
          }
        : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
