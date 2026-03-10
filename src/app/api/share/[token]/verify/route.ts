import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const body = await request.json().catch(() => ({}));
  const { password } = body as { password?: string };
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

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

  if (!link.passwordHash) {
    return NextResponse.json({ error: "This link does not require a password" }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, link.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
  }

  // Increment view count
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 } },
  });

  // Get linked shares map
  const parentId = link.parentId ?? link.id;
  const siblings = await prisma.shareLink.findMany({
    where: {
      OR: [
        { parentId: parentId },
        ...(link.parentId ? [{ id: link.parentId }] : []),
      ],
      revokedAt: null,
    },
    include: { entry: { select: { id: true, title: true } } },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3500";
  const linkedShares: Record<number, { token: string; title: string; url: string }> = {};
  for (const s of siblings) {
    linkedShares[s.entry.id] = {
      token: s.token,
      title: s.entry.title,
      url: `${baseUrl}/share/${s.token}`,
    };
  }

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
    linkedShares,
  });
}
