import { NextResponse } from "next/server";
import { getSessionPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const principal = await getSessionPrincipal();
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin can write to all collections
  if (principal.isAdmin) {
    const collections = await prisma.collection.findMany({
      select: { id: true, name: true, icon: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      collections: collections.map((c) => ({ ...c, icon: c.icon || undefined })),
      canCreate: true,
    });
  }

  // Get user's group IDs including Everyone group
  const groupIds = [...principal.groupIds];
  const everyoneGroup = await prisma.group.findUnique({
    where: { name: "Everyone" },
    select: { id: true },
  });
  if (everyoneGroup && !groupIds.includes(everyoneGroup.id)) {
    groupIds.push(everyoneGroup.id);
  }

  // Find collections where user has admin or editor role
  const groupCollectionRoles = await prisma.groupCollectionRole.findMany({
    where: {
      groupId: { in: groupIds },
      role: { in: ["admin", "editor"] },
    },
    select: { collectionId: true },
    distinct: ["collectionId"],
  });

  const writableCollectionIds = groupCollectionRoles.map((gcr) => gcr.collectionId);

  if (writableCollectionIds.length === 0) {
    return NextResponse.json({ collections: [], canCreate: false });
  }

  const collections = await prisma.collection.findMany({
    where: { id: { in: writableCollectionIds } },
    select: { id: true, name: true, icon: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    collections: collections.map((c) => ({ ...c, icon: c.icon || undefined })),
    canCreate: true,
  });
}
