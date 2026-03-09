import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { entryWithAuthorInclude, serializeEntry } from "@/lib/entries";
import { prisma } from "@/lib/prisma";
import { runEntrySerializeHooks } from "@/lib/plugins/manager";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const favorites = await prisma.userFavorite.findMany({
    where: { userId: principal.id },
    include: {
      entry: {
        include: entryWithAuthorInclude,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter out soft-deleted entries, then run serialize hooks
  const entries = await Promise.all(
    favorites
      .filter((f) => !f.entry.deletedAt)
      .map(async (f) => {
        const base = { ...serializeEntry(f.entry), isFavorited: true } as Record<string, unknown>;
        return runEntrySerializeHooks(base, principal);
      })
  );

  return NextResponse.json({ entries });
}
