import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleCollectionIds } from "@/lib/permissions";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));

  // Build ACL filter
  const collectionIds = await getAccessibleCollectionIds(principal.id, principal.isAdmin);
  let where: Record<string, unknown> = {};

  if (collectionIds !== null) {
    // Non-admin: get all entry IDs in accessible collections
    const accessibleEntries = await prisma.entry.findMany({
      where: { collections: { some: { id: { in: collectionIds } } } },
      select: { id: true },
    });
    const accessibleEntryIds = accessibleEntries.map((e) => e.id);

    where = {
      OR: [
        { entryId: null }, // system activities visible to all
        { entryId: { in: accessibleEntryIds } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
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
