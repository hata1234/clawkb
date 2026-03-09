import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id);

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_entryId: { userId: principal.id, entryId } },
  });

  if (existing) {
    await prisma.userFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  } else {
    await prisma.userFavorite.create({ data: { userId: principal.id, entryId } });
    return NextResponse.json({ favorited: true });
  }
}
