import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getRequestPrincipal } from "@/lib/auth";
import { canEditEntry, canDeleteEntry, getAccessibleCollectionIds } from "@/lib/permissions";
import { entryWithAuthorInclude, serializeEntry } from "@/lib/entries";
import {
  getEntryRenderBlocks,
  resolveContentTags,
  runEntryAfterStatusChangeHooks,
  runEntryAfterUpdateHooks,
  runEntryBeforeDeleteHooks,
  runEntryBeforeStatusChangeHooks,
  runEntryBeforeUpdateHooks,
  runEntrySerializeHooks,
} from "@/lib/plugins/manager";
import { prisma } from "@/lib/prisma";
import { generateAndStoreChunks } from "@/lib/embedding";
import { logActivity } from "@/lib/activity";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { dispatchNotification } from "@/lib/notifications";
import { auditLog, computeChanges } from "@/lib/audit";

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
  bpmnXml?: string | null;
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

  // ACL check: verify user can access this entry's collections
  const accessibleIds = await getAccessibleCollectionIds(principal.id, principal.isAdmin);
  if (accessibleIds !== null) {
    const entryCollectionIds = entry.collections?.map((c: { id: number }) => c.id) || [];
    const hasAccess = entryCollectionIds.some((cid: number) => accessibleIds.includes(cid));
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let isFavorited = false;
  if (principal.id) {
    const fav = await prisma.userFavorite.findUnique({
      where: { userId_entryId: { userId: principal.id, entryId: entry.id } },
    });
    isFavorited = !!fav;
  }

  const pluginRender = await getEntryRenderBlocks(entry as unknown as Record<string, unknown>, principal);
  const resolvedTags = await resolveContentTags(entry.content, entry as unknown as Record<string, unknown>, principal);
  const base = { ...serializeEntry(entry), isFavorited, pluginRender, resolvedTags } as Record<string, unknown>;
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
    include: { tags: true, collections: { select: { id: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canEditEntry(
    principal.id,
    { authorId: existing.authorId, collections: existing.collections },
    principal.isAdmin,
  );
  if (!allowed) {
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

  const hookedBody = (await runEntryBeforeUpdateHooks(
    body as Record<string, unknown>,
    existing as unknown as Record<string, unknown>,
    principal,
  )) as EntryUpdateInput;
  const {
    type,
    source,
    title,
    summary,
    content,
    status,
    url,
    tags,
    metadata,
    addImages,
    removeImageIds,
    collectionIds,
    bpmnXml,
  } = hookedBody;

  // Status change hook — let plugins validate/block the transition
  const isStatusChanging = status !== undefined && status !== existing.status;
  if (isStatusChanging) {
    const allowed = await runEntryBeforeStatusChangeHooks(
      existing as unknown as Record<string, unknown>,
      existing.status,
      status,
      principal,
      (body as Record<string, unknown>).statusChangeReason as string | undefined,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: `Status transition from "${existing.status}" to "${status}" is not allowed` },
        { status: 403 },
      );
    }
  }

  // Remove images if requested
  if (removeImageIds && removeImageIds.length > 0) {
    await prisma.entryImage.deleteMany({
      where: { id: { in: removeImageIds }, entryId: parseInt(id) },
    });
  }

  let tagConnect = undefined;
  if (tags !== undefined) {
    const tagRecords =
      tags.length > 0
        ? await Promise.all(tags.map((name) => prisma.tag.upsert({ where: { name }, update: {}, create: { name } })))
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
      ...(bpmnXml !== undefined && { bpmnXml }),
      ...(collectionIds !== undefined && {
        collections: { set: collectionIds.map((id) => ({ id })) },
      }),
      ...(addImages &&
        addImages.length > 0 && {
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

  // Auto-manage Uncategorized collection
  if (collectionIds !== undefined) {
    const uncategorized = await prisma.collection.findFirst({ where: { builtIn: true, name: "未歸類" } });
    if (uncategorized) {
      if (collectionIds.length === 0) {
        // No collections → assign to Uncategorized
        await prisma.entry.update({
          where: { id: entry.id },
          data: { collections: { connect: [{ id: uncategorized.id }] } },
        });
      } else if (collectionIds.includes(uncategorized.id) && collectionIds.length > 1) {
        // Has real collections → remove from Uncategorized
        await prisma.entry.update({
          where: { id: entry.id },
          data: { collections: { disconnect: [{ id: uncategorized.id }] } },
        });
      }
    }
  }

  // Re-chunk embeddings if content-related fields changed
  if (title !== undefined || summary !== undefined || content !== undefined) {
    generateAndStoreChunks(entry).catch(() => {});
  }

  runEntryAfterUpdateHooks(
    entry as unknown as Record<string, unknown>,
    existing as unknown as Record<string, unknown>,
    principal,
  ).catch(() => {});

  // Fire afterStatusChange if status actually changed
  if (isStatusChanging) {
    runEntryAfterStatusChangeHooks(
      entry as unknown as Record<string, unknown>,
      existing.status,
      status!,
      principal,
      (body as Record<string, unknown>).statusChangeReason as string | undefined,
    ).catch(() => {});
  }

  // Audit trail
  const auditChanges = computeChanges(
    { title: existing.title, status: existing.status, type: existing.type, source: existing.source, content: existing.content ? "[content]" : null, summary: existing.summary },
    { title: entry.title, status: entry.status, type: entry.type, source: entry.source, content: entry.content ? "[content]" : null, summary: entry.summary },
    ["title", "status", "type", "source", "content", "summary"],
  );
  auditLog({
    entityType: "entry",
    entityId: entry.id,
    action: isStatusChanging ? "status_change" : "update",
    actorId: principal.id,
    changes: auditChanges,
    metadata: isStatusChanging ? { fromStatus: existing.status, toStatus: status } : undefined,
  }).catch(() => {});
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
  const entry = await prisma.entry.findUnique({
    where: { id: parseInt(id) },
    include: { collections: { select: { id: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canDeleteEntry(
    principal.id,
    { authorId: entry.authorId, collections: entry.collections },
    principal.isAdmin,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await runEntryBeforeDeleteHooks(entry as unknown as Record<string, unknown>, principal);
  await prisma.entry.update({
    where: { id: parseInt(id) },
    data: { deletedAt: new Date(), deletedBy: principal.id },
  });

  auditLog({
    entityType: "entry",
    entityId: parseInt(id),
    action: "delete",
    actorId: principal.id,
    metadata: { title: entry.title },
  }).catch(() => {});
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
    if (fav.userId === editorId) continue;
    dispatchNotification(fav.userId, {
      type: "entry_update",
      title: `"${entryTitle}" was updated`,
      link: `/entries/${entryId}`,
    }).catch(() => {});
  }
}
