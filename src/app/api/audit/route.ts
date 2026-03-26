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
  const actionParam = searchParams.get("action") || undefined;
  const actorId = searchParams.get("actorId") ? parseInt(searchParams.get("actorId")!) : undefined;
  const from = searchParams.get("from") || searchParams.get("startDate") || undefined;
  const to = searchParams.get("to") || searchParams.get("endDate") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : undefined;
  const limit = Math.min(10000, pageSize ?? parseInt(searchParams.get("limit") || "50"));
  const format = searchParams.get("format") || "json"; // json | csv

  // Support comma-separated actions for multi-select
  const actions = actionParam ? actionParam.split(",").filter(Boolean) : undefined;

  const where: Prisma.AuditEventWhereInput = {
    ...(entityType && entityType !== "all" && { entityType }),
    ...(entityId && { entityId }),
    ...(actions && actions.length === 1 && { action: actions[0] }),
    ...(actions && actions.length > 1 && { action: { in: actions } }),
    ...(actorId && { actorId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
    ...(search && {
      OR: [
        { entityId: { equals: isNaN(parseInt(search)) ? undefined : parseInt(search) } },
        { changes: { path: [], string_contains: search } },
        { metadata: { path: [], string_contains: search } },
      ].filter((c) => Object.keys(c).length > 0),
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
    const header = "timestamp,actor,action,entityType,entityId,changes_summary";
    const rows = enriched.map((e) => {
      const changes = e.changes as Record<string, unknown> | null;
      let changesSummary = "";
      if (changes && typeof changes === "object") {
        const fromVal = changes.from ?? changes.old ?? changes.previous;
        const toVal = changes.to ?? changes.new ?? changes.next;
        if (fromVal !== undefined && toVal !== undefined) {
          changesSummary = `${fromVal} → ${toVal}`;
        } else {
          changesSummary = Object.entries(changes)
            .slice(0, 2)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
        }
      }
      return [
        e.createdAt.toISOString(),
        e.actor?.username ?? e.actorId?.toString() ?? "",
        e.action,
        e.entityType,
        e.entityId?.toString() ?? "",
        changesSummary,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-trail-${new Date().toISOString().slice(0, 10)}.csv"`,
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
