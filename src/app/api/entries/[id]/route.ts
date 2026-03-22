import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { canDeleteEntry, canEditEntry, getRequestPrincipal } from "@/lib/auth";
import { entryWithAuthorInclude, serializeEntry } from "@/lib/entries";
import { getEntryRenderBlocks, runEntryAfterUpdateHooks, runEntryBeforeDeleteHooks, runEntryBeforeUpdateHooks, runEntrySerializeHooks } from "@/lib/plugins/manager";
import { prisma } from "@/lib/prisma";
import { generateAndStoreChunks } from "@/lib/embedding";
import { logActivity } from "@/lib/activity";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { dispatchNotification } from "@/lib/notifications";

interface EntryImageInput {
  url: string;
  key: string;
  filename: string;
  mimeType?: string;
  size?: number;
  caption?: string;
}

interface EntryUpdateInput {
  type?: string;
  source?: string;
  title?: string;
  summary?: string | null;
  content?: string | null;
  status?: string;
  url?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  addImages?: EntryImageInput[];
  removeImageIds?: number[];
  editNote?: string;
  collectionIds?: number[];
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: { id: parseInt(id) },
    include: entryWithAuthorInclude,
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let isFavorited = false;
  if (principal.id) {
    const fav = await prisma.userFavorite.findUnique({
      where: { userId_entryId: { userId: principal.id, entryId: entry.id } },
    });
    isFavorited = !!fav;
  }

  const pluginRender = await getEntryRenderBlocks(entry as unknown as Record<string, unknown>, principal);
  const base = { ...serializeEntry(entry), isFavorited, pluginRender } as Record<string, unknown>;
  const serialized = await runEntrySerializeHooks(base, principal);
  return NextResponse.json(serialized);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.entry.findUnique({
    where: { id: parseInt(id) },
    include: { tags: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditEntry(principal, existing.authorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Save revision snapshot BEFORE applying changes
  await prisma.entryRevision.create({
    data: {
      entryId: existing.id,
      authorId: principal.id,
      title: existing.title,
      summary: existing.summary,
      content: existing.content,
      status: existing.status,
      type: existing.type,
      source: existing.source,
      url: existing.url,
      metadata: existing.metadata as Prisma.InputJsonValue,
      tags: existing.tags.map((t) => t.name),
      editNote: (body as EntryUpdateInput).editNote || null,
    },
  });

  const hookedBody = await runEntryBeforeUpdateHooks(body as Record<string, unknown>, existing as unknown as Record<string, unknown>, principal) as EntryUpdateInput;
  const { type, source, title, summary, content, status, url, tags, metadata, addImages, removeImageIds, collectionIds } = hookedBody;

  // Remove images if requested
  if (removeImageIds && removeImageIds.length > 0) {
    await prisma.entryImage.deleteMany({
      where: { id: { in: removeImageIds }, entryId: parseInt(id) },
    });
  }

  let tagConnect = undefined;
  if (tags !== undefined) {
    const tagRecords = tags.length > 0
      ? await Promise.all(
          tags.map((name) =>
            prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
          )
        )
      : [];
    tagConnect = { set: tagRecords.map((t: { id: number }) => ({ id: t.id })) };
  }

  const entry = await prisma.entry.update({
    where: { id: parseInt(id) },
    data: {
      ...(type !== undefined && { type }),
      ...(source !== undefined && { source }),
      ...(title !== undefined && { title }),
      ...(summary !== undefined && { summary }),
      ...(content !== undefined && { content }),
      ...(status !== undefined && { status }),
      ...(url !== undefined && { url }),
      ...(metadata !== undefined && { metadata: metadata as Prisma.InputJsonValue }),
      ...(tagConnect && { tags: tagConnect }),
      ...(collectionIds !== undefined && {
        collections: { set: collectionIds.map((id) => ({ id })) },
      }),
      ...(addImages && addImages.length > 0 && {
        images: {
          create: addImages.map((img, i: number) => ({
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

  // Re-chunk embeddings if content-related fields changed
  if (title !== undefined || summary !== undefined || content !== undefined) {
    generateAndStoreChunks(entry).catch(() => {});
  }

  runEntryAfterUpdateHooks(
    entry as unknown as Record<string, unknown>,
    existing as unknown as Record<string, unknown>,
    principal
  ).catch(() => {});

  logActivity("entry.updated", principal.id, entry.id, { title: entry.title }).catch(() => {});
  dispatchWebhookEvent("entry.updated", { id: entry.id, title: entry.title, type: entry.type, source: entry.source });

  // Notify users who favorited this entry about the update
  notifyFavoriters(entry.id, entry.title, principal.id).catch(() => {});

  return NextResponse.json(serializeEntry(entry));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id: parseInt(id) } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canDeleteEntry(principal, entry.authorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await runEntryBeforeDeleteHooks(entry as unknown as Record<string, unknown>, principal);
  await prisma.entry.update({
    where: { id: parseInt(id) },
    data: { deletedAt: new Date(), deletedBy: principal.id },
  });

  logActivity("entry.deleted", principal.id, parseInt(id), { title: entry.title }).catch(() => {});
  dispatchWebhookEvent("entry.deleted", { id: parseInt(id), title: entry.title });

  return NextResponse.json({ success: true });
}

async function notifyFavoriters(entryId: number, entryTitle: string, editorId: number | null) {
  const favorites = await prisma.userFavorite.findMany({
    where: { entryId },
    select: { userId: true },
  });
  for (const fav of favorites) {
    if (fav.userId === editorId) continue; // Don't notify the editor
    dispatchNotification(fav.userId, {
      type: "entry_update",
      title: `"${entryTitle}" was updated`,
      link: `/entries/${entryId}`,
    }).catch(() => {});
  }
}
