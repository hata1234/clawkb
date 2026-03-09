import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { canCreateEntries, getRequestPrincipal } from "@/lib/auth";
import { serializeEntry, entryWithAuthorInclude } from "@/lib/entries";
import { prisma } from "@/lib/prisma";
import { generateAndStoreEmbedding } from "@/lib/embedding";
import { runEntryAfterCreateHooks, runEntryBeforeCreateHooks } from "@/lib/plugins/manager";

interface EntryImageInput {
  url: string;
  key: string;
  filename: string;
  mimeType?: string;
  size?: number;
  caption?: string;
}

interface EntryMutationInput {
  type?: string;
  source?: string;
  title?: string;
  summary?: string | null;
  content?: string | null;
  status?: string;
  url?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  images?: EntryImageInput[];
}

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      include: entryWithAuthorInclude,
      orderBy: { createdAt: sort },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.entry.count({ where }),
  ]);

  return NextResponse.json({
    entries: entries.map(serializeEntry),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const hookedBody = await runEntryBeforeCreateHooks(body as Record<string, unknown>, principal) as EntryMutationInput;
  const { type, source, title, summary, content, status, url, tags, metadata, images } = hookedBody;

  if (!type || !source || !title) {
    return NextResponse.json({ error: "type, source, title are required" }, { status: 400 });
  }

  // Upsert tags
  const tagRecords = tags && tags.length > 0
    ? await Promise.all(
        tags.map((name) =>
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
      metadata: (metadata || {}) as Prisma.InputJsonValue,
      authorId: principal.id,
      tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      ...(images && images.length > 0 && {
        images: {
          create: images.map((img, i: number) => ({
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
    include: entryWithAuthorInclude,
  });

  // Fire-and-forget embedding generation (don't block response)
  generateAndStoreEmbedding(entry).catch(() => {});

  // Auto-tag if no manual tags provided (fire-and-forget)
  runEntryAfterCreateHooks(entry as unknown as Record<string, unknown>, hookedBody as unknown as Record<string, unknown>, principal).catch(() => {});

  return NextResponse.json(serializeEntry(entry), { status: 201 });
}
