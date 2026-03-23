import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleCollectionIds } from "@/lib/permissions";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collectionIds = await getAccessibleCollectionIds(principal.id, principal.isAdmin);
  const aclWhere = collectionIds
    ? { deletedAt: null, collections: { some: { id: { in: collectionIds } } } }
    : { deletedAt: null };

  const [total, byTypeRaw, byStatusRaw, bySourceRaw, recentRaw] = await Promise.all([
    prisma.entry.count({ where: aclWhere }),
    prisma.entry.groupBy({ by: ["type"], where: aclWhere, _count: true, orderBy: { _count: { type: "desc" } } }),
    prisma.entry.groupBy({ by: ["status"], where: aclWhere, _count: true, orderBy: { _count: { status: "desc" } } }),
    prisma.entry.groupBy({ by: ["source"], where: aclWhere, _count: true, orderBy: { _count: { source: "desc" } } }),
    prisma.entry.groupBy({
      by: ["createdAt"],
      where: aclWhere,
      _count: true,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const byType = Object.fromEntries(byTypeRaw.map(r => [r.type, r._count]));
  const byStatus = Object.fromEntries(byStatusRaw.map(r => [r.status, r._count]));
  const bySource = Object.fromEntries(bySourceRaw.map(r => [r.source, r._count]));

  // Aggregate recent by day (last 14 days)
  const dayMap: Record<string, number> = {};
  for (const r of recentRaw) {
    const day = new Date(r.createdAt).toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + r._count;
  }
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: dayMap[key] || 0 };
  }).reverse();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = await prisma.entry.count({ where: { ...aclWhere, createdAt: { gte: weekAgo } } });

  return NextResponse.json({ total, byType, byStatus, bySource, thisWeek, trend: last14 });
}
