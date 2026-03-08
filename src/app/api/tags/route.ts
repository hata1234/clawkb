import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tags = await prisma.tag.findMany({
    include: { _count: { select: { entries: true } } },
    orderBy: { entries: { _count: "desc" } },
  });

  return NextResponse.json(tags.map(t => ({ id: t.id, name: t.name, count: t._count.entries })));
}
