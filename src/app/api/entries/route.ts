import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { canCreateEntries, getRequestPrincipal } from "@/lib/auth";
import { getAccessibleCollectionIds } from "@/lib/permissions";
import { serializeEntry, entryWithAuthorInclude } from "@/lib/entries";
import { prisma } from "@/lib/prisma";
import { generateAndStoreChunks } from "@/lib/embedding";
import { getEntryCardElements, runEntryAfterCreateHooks, runEntryAfterQueryHooks, runEntryBeforeCreateHooks, runEntrySerializeHooks } from "@/lib/plugins/manager";
import { logActivity } from "@/lib/activity";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { generateDocNumber } from "@/lib/doc-number";

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
  collectionIds?: number[];
  bpmnXml?: string | null;
}


// Recursively collect collection IDs (self + all descendants)
async function getCollectionIdsRecursive(rootId: number): Promise<number[]> {
  const all = await prisma.collection.findMany({ select: { id: true, parentId: true } });
  const ids: number[] = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const c of all) {
      if (c.parentId === parentId && !ids.includes(c.id)) {
        ids.push(c.id);
        queue.push(c.id);
      }
    }
  }
  return ids;
}

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const source = searchParams.get("source") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const collectionId = searchParams.get("collectionId") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
  const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";

  const includeDeleted = searchParams.get("includeDeleted") === "true" && principal.isAdmin;

  // Collection access control
  const accessibleIds = await getAccessibleCollectionIds(principal.id, principal.isAdmin);

  const andConditions: Prisma.EntryWhereInput[] = [];

  // Search filter (uses OR internally)
  if (search) {
    andConditions.push({
      OR: [
        ...(/^\d+$/.test(search) ? [{ id: parseInt(search) }] : []),
        { title: { contains: search, mode: "insensitive" as const } },
        { summary: { contains: search, mode: "insensitive" as const } },
        { content: { contains: search, mode: "insensitive" as const } },
      ],
    });
  }

  // Collection access control filter (uses OR internally)
  if (accessibleIds !== null) {
    andConditions.push({
      OR: [
        { collections: { some: { id: { in: accessibleIds } } } },
        { collections: { none: {} } },
      ],
    });
  }

  const where: Prisma.EntryWhereInput = {
    ...(!includeDeleted && { deletedAt: null }),
    ...(type && { type }),
    ...(status && { status }),
    ...(source && { source }),
    ...(tag && { tags: { some: { name: tag } } }),
    ...(collectionId && { collections: { some: { id: { in: await getCollectionIdsRecursive(parseInt(collectionId)) } } } }),
    ...(andConditions.length > 0 && { AND: andConditions }),
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

  // Add isFavorited for authenticated users
  let favoriteEntryIds = new Set<number>();
  if (principal.id) {
    const favorites = await prisma.userFavorite.findMany({
      where: { userId: principal.id, entryId: { in: entries.map((e) => e.id) } },
      select: { entryId: true },
    });
    favoriteEntryIds = new Set(favorites.map((f) => f.entryId));
  }

  // Run serialize and card element hooks per entry
  let serializedEntries = await Promise.all(
    entries.map(async (e) => {
      const base = { ...serializeEntry(e), isFavorited: favoriteEntryIds.has(e.id) } as Record<string, unknown>;
      const serialized = await runEntrySerializeHooks(base, principal);
      const cardElements = await getEntryCardElements(serialized, principal);
      return { ...serialized, cardElements };
    })
  );

  // Run batch afterQuery hooks
  serializedEntries = await runEntryAfterQueryHooks(serializedEntries, principal) as typeof serializedEntries;

  return NextResponse.json({
    entries: serializedEntries,
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
  const { type, source, title, summary, content, status, url, tags, metadata, images, collectionIds, bpmnXml } = hookedBody;

  // Default type to "entry" if not specified
  const entryType = type || "entry";

  if (!source || !title) {
    return NextResponse.json({ error: "source and title are required" }, { status: 400 });
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
      type: entryType,
      source,
      title,
      summary: summary || null,
      content: content || null,
      status: status || "new",
      url: url || null,
      metadata: (metadata || {}) as Prisma.InputJsonValue,
      authorId: principal.id,
      ...(bpmnXml !== undefined && { bpmnXml }),
      tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      ...(collectionIds && collectionIds.length > 0 && {
        collections: { connect: collectionIds.map((id) => ({ id })) },
      }),
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

  // Generate document number if entry belongs to a collection with a prefix
  let finalEntry: typeof entry = entry;
  if (collectionIds && collectionIds.length > 0) {
    const docNumber = await generateDocNumber(collectionIds);
    if (docNumber) {
      finalEntry = await prisma.entry.update({
        where: { id: entry.id },
        data: { docNumber },
        include: entryWithAuthorInclude,
      }) as typeof entry;
    }
  }

  // Fire-and-forget chunked embedding generation (don't block response)
  generateAndStoreChunks(finalEntry).catch(() => {});

  // Auto-tag if no manual tags provided (fire-and-forget)
  runEntryAfterCreateHooks(finalEntry as unknown as Record<string, unknown>, hookedBody as unknown as Record<string, unknown>, principal).catch(() => {});

  logActivity("entry.created", principal.id, finalEntry.id, { title: finalEntry.title }).catch(() => {});
  dispatchWebhookEvent("entry.created", { id: finalEntry.id, title: finalEntry.title, type: finalEntry.type, source: finalEntry.source });

  return NextResponse.json(serializeEntry(finalEntry), { status: 201 });
}
