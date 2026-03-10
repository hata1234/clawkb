import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function validateAndGetLink(token: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      entry: {
        include: {
          tags: true,
          images: true,
          author: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!link || link.revokedAt) return { error: "This link has expired or is no longer available", status: 404 };
  if (link.expiresAt && link.expiresAt < new Date()) return { error: "This link has expired or is no longer available", status: 410 };
  if (link.maxViews !== null && link.viewCount >= link.maxViews) return { error: "This link has reached its view limit", status: 410 };
  if (link.entry.deletedAt) return { error: "This link has expired or is no longer available", status: 404 };

  return { link };
}

async function getLinkedSharesMap(link: { id: number; parentId: number | null }) {
  // If this is a child link, find siblings via parent
  // If this is a parent link, find children directly
  const parentId = link.parentId ?? link.id;

  const siblings = await prisma.shareLink.findMany({
    where: {
      OR: [
        { parentId: parentId },
        // Also include the parent itself if we're a child
        ...(link.parentId ? [{ id: link.parentId }] : []),
      ],
      revokedAt: null,
    },
    include: { entry: { select: { id: true, title: true } } },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3500";
  const map: Record<number, { token: string; title: string; url: string }> = {};
  for (const s of siblings) {
    map[s.entry.id] = {
      token: s.token,
      title: s.entry.title,
      url: `${baseUrl}/share/${s.token}`,
    };
  }
  return map;
}

function formatEntryResponse(entry: NonNullable<Awaited<ReturnType<typeof validateAndGetLink>>["link"]>["entry"], linkedShares: Record<number, { token: string; title: string; url: string }>) {
  return {
    title: entry.title,
    summary: entry.summary,
    content: entry.content,
    images: entry.images.map((img) => ({
      url: img.url,
      filename: img.filename,
      caption: img.caption,
    })),
    tags: entry.tags.map((t) => t.name),
    author: entry.author
      ? { displayName: entry.author.displayName, avatarUrl: entry.author.avatarUrl }
      : null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    linkedShares,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validateAndGetLink(token);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const link = result.link;

  // Check password
  if (link.passwordHash) {
    const url = new URL(request.url);
    const password = url.searchParams.get("password");
    if (!password) {
      return NextResponse.json({ requiresPassword: true }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, link.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }
  }

  // Increment view count
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 } },
  });

  const linkedShares = await getLinkedSharesMap(link);
  return NextResponse.json(formatEntryResponse(link.entry, linkedShares));
}
