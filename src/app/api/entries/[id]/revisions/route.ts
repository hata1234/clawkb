import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id);

  const revisions = await prisma.entryRevision.findMany({
    where: { entryId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    revisions: revisions.map((r) => ({
      id: r.id,
      entryId: r.entryId,
      title: r.title,
      summary: r.summary,
      content: r.content,
      status: r.status,
      type: r.type,
      source: r.source,
      url: r.url,
      metadata: r.metadata,
      tags: r.tags,
      editNote: r.editNote,
      createdAt: r.createdAt.toISOString(),
      author: r.author
        ? {
            id: r.author.id,
            username: r.author.username,
            displayName: r.author.displayName || r.author.username,
            avatarUrl: r.author.avatarUrl,
          }
        : null,
    })),
  });
}
