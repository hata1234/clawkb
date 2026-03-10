import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

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

  if (!link || link.revokedAt) {
    return NextResponse.json({ error: "This link has expired or is no longer available" }, { status: 404 });
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired or is no longer available" }, { status: 410 });
  }

  if (link.maxViews !== null && link.viewCount >= link.maxViews) {
    return NextResponse.json({ error: "This link has reached its view limit" }, { status: 410 });
  }

  if (link.entry.deletedAt) {
    return NextResponse.json({ error: "This link has expired or is no longer available" }, { status: 404 });
  }

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

  const entry = link.entry;
  return NextResponse.json({
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
  });
}
