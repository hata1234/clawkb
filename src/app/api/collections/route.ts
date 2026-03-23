import { NextResponse } from "next/server";
import { getRequestPrincipal, canCreateEntries } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collections = await prisma.collection.findMany({
    include: {
      _count: { select: { entries: true, children: true } },
      accessRoles: {
        include: { role: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Build tree structure
  type CollectionNode = (typeof collections)[number] & { children: CollectionNode[]; totalEntries: number };
  const map = new Map<number, CollectionNode>();
  const roots: CollectionNode[] = [];

  for (const c of collections) {
    map.set(c.id, { ...c, children: [], totalEntries: c._count.entries });
  }
  for (const c of collections) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Compute recursive entry counts (post-order)
  function computeTotalEntries(node: CollectionNode): number {
    let total = node._count.entries;
    for (const child of node.children) {
      total += computeTotalEntries(child);
    }
    node.totalEntries = total;
    return total;
  }
  for (const root of roots) computeTotalEntries(root);

  return NextResponse.json({ collections: roots, flat: collections });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, icon, color, parentId, sortOrder, accessRoleIds } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const collection = await prisma.collection.create({
    data: {
      name: name.trim(),
      description: description || null,
      icon: icon || null,
      color: color || null,
      parentId: parentId || null,
      sortOrder: sortOrder ?? 0,
      ...(accessRoleIds && accessRoleIds.length > 0 && {
        accessRoles: {
          create: (accessRoleIds as number[]).map((roleId) => ({ roleId })),
        },
      }),
    },
    include: {
      _count: { select: { entries: true, children: true } },
      accessRoles: { include: { role: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(collection, { status: 201 });
}
