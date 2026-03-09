import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { entryWithAuthorInclude, serializeEntry } from "@/lib/entries";
import { prisma } from "@/lib/prisma";
import { runEntrySerializeHooks } from "@/lib/plugins/manager";

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (principal.effectiveRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.entry.findMany({
    where: { deletedAt: { not: null } },
    include: entryWithAuthorInclude,
    orderBy: { deletedAt: "desc" },
  });

  const serializedEntries = await Promise.all(
    entries.map(async (e) => {
      const base = {
        ...serializeEntry(e),
        deletedAt: e.deletedAt?.toISOString() ?? null,
      } as Record<string, unknown>;
      return runEntrySerializeHooks(base, principal);
    })
  );

  return NextResponse.json({
    entries: serializedEntries,
    total: entries.length,
  });
}
