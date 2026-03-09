import { NextResponse } from "next/server";
import { getRequestPrincipal, canCreateEntries } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const collectionId = parseInt(id);
  const { entryIds } = await request.json();

  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return NextResponse.json({ error: "entryIds array is required" }, { status: 400 });
  }

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      entries: { connect: entryIds.map((eid: number) => ({ id: eid })) },
    },
  });

  return NextResponse.json({ success: true, added: entryIds.length });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const collectionId = parseInt(id);
  const { entryIds } = await request.json();

  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return NextResponse.json({ error: "entryIds array is required" }, { status: 400 });
  }

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      entries: { disconnect: entryIds.map((eid: number) => ({ id: eid })) },
    },
  });

  return NextResponse.json({ success: true, removed: entryIds.length });
}
