import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getRequestPrincipal, canManageSettings } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal || !canManageSettings(principal)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") || undefined;
  const entityId = searchParams.get("entityId") ? parseInt(searchParams.get("entityId")!) : undefined;
  const action = searchParams.get("action") || undefined;
  const actorId = searchParams.get("actorId") ? parseInt(searchParams.get("actorId")!) : undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const format = searchParams.get("format") || "json"; // json | csv

  const where: Prisma.AuditEventWhereInput = {
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(action && { action }),
    ...(actorId && { actorId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  // Enrich with actor usernames
  const actorIds = [...new Set(events.map((e) => e.actorId).filter(Boolean))] as number[];
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, username: true, displayName: true },
      })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const enriched = events.map((e) => ({
    ...e,
    actor: e.actorId ? actorMap.get(e.actorId) || null : null,
  }));

  if (format === "csv") {
    const header = "id,entityType,entityId,action,actorId,actor,changes,metadata,createdAt";
    const rows = enriched.map((e) =>
      [
        e.id,
        e.entityType,
        e.entityId ?? "",
        e.action,
        e.actorId ?? "",
        e.actor?.username ?? "",
        e.changes ? JSON.stringify(e.changes).replace(/"/g, '""') : "",
        e.metadata ? JSON.stringify(e.metadata).replace(/"/g, '""') : "",
        e.createdAt.toISOString(),
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    events: enriched,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
