import { NextResponse } from "next/server";
import { getRequestPrincipal, canCreateEntries } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id: parseInt(id) },
    include: {
      children: { include: { _count: { select: { entries: true } } }, orderBy: { sortOrder: "asc" } },
      _count: { select: { entries: true, children: true } },
      groupRoles: { include: { group: { select: { id: true, name: true } } } },
    },
  });

  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(collection);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const collectionId = parseInt(id);
  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.icon !== undefined) data.icon = body.icon || null;
  if (body.color !== undefined) data.color = body.color || null;
  if (body.parentId !== undefined) data.parentId = body.parentId || null;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.docPrefix !== undefined) data.docPrefix = body.docPrefix || null;

  // Handle groupRoles update: delete all then recreate
  if (body.groupRoles !== undefined) {
    await prisma.groupCollectionRole.deleteMany({ where: { collectionId } });
    if (Array.isArray(body.groupRoles) && body.groupRoles.length > 0) {
      await prisma.groupCollectionRole.createMany({
        data: (body.groupRoles as { groupId: number; role: string }[]).map((gr) => ({
          collectionId,
          groupId: gr.groupId,
          role: gr.role || "viewer",
        })),
        skipDuplicates: true,
      });
    }
  }

  const collection = await prisma.collection.update({
    where: { id: collectionId },
    data,
    include: {
      _count: { select: { entries: true, children: true } },
      groupRoles: { include: { group: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(collection);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const collectionId = parseInt(id);

  // Reassign children to parent (or root)
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.collection.updateMany({
    where: { parentId: collectionId },
    data: { parentId: collection.parentId },
  });

  await prisma.collection.delete({ where: { id: collectionId } });

  return NextResponse.json({ success: true });
}
