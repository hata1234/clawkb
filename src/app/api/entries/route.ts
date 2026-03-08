import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndStoreEmbedding } from "@/lib/embedding";

export async function GET(request: Request) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const source = searchParams.get("source") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
  const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";

  const where = {
    ...(type && { type }),
    ...(status && { status }),
    ...(source && { source }),
    ...(tag && { tags: { some: { name: tag } } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { summary: { contains: search, mode: "insensitive" as const } },
        { content: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      include: {
        tags: true,
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, key: true, filename: true } },
      },
      orderBy: { createdAt: sort },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.entry.count({ where }),
  ]);

  return NextResponse.json({ entries, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, source, title, summary, content, status, url, tags, metadata, images } = body;

  if (!type || !source || !title) {
    return NextResponse.json({ error: "type, source, title are required" }, { status: 400 });
  }

  // Upsert tags
  const tagRecords = tags && tags.length > 0
    ? await Promise.all(
        tags.map((name: string) =>
          prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
        )
      )
    : [];

  const entry = await prisma.entry.create({
    data: {
      type,
      source,
      title,
      summary: summary || null,
      content: content || null,
      status: status || "new",
      url: url || null,
      metadata: metadata || {},
      tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      ...(images && images.length > 0 && {
        images: {
          create: images.map((img: { url: string; key: string; filename: string; mimeType?: string; size?: number; caption?: string }, i: number) => ({
            url: img.url,
            key: img.key,
            filename: img.filename,
            mimeType: img.mimeType || "image/png",
            size: img.size || 0,
            caption: img.caption || null,
            sortOrder: i,
          })),
        },
      }),
    },
    include: { tags: true, images: { orderBy: { sortOrder: "asc" } } },
  });

  // Fire-and-forget embedding generation (don't block response)
  generateAndStoreEmbedding(entry).catch(() => {});

  return NextResponse.json(entry, { status: 201 });
}
