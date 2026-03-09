import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { canDeleteEntry, canEditEntry, getRequestPrincipal } from "@/lib/auth";
import { entryWithAuthorInclude, serializeEntry } from "@/lib/entries";
import { getEntryRenderBlocks, runEntryAfterUpdateHooks, runEntryBeforeDeleteHooks, runEntryBeforeUpdateHooks } from "@/lib/plugins/manager";
import { prisma } from "@/lib/prisma";

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
  const pluginRender = await getEntryRenderBlocks(entry as unknown as Record<string, unknown>, principal);
  return NextResponse.json({ ...serializeEntry(entry), pluginRender });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.entry.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditEntry(principal, existing.authorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hookedBody = await runEntryBeforeUpdateHooks(body as Record<string, unknown>, existing as unknown as Record<string, unknown>, principal) as EntryUpdateInput;
  const { type, source, title, summary, content, status, url, tags, metadata, addImages, removeImageIds } = hookedBody;

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

  runEntryAfterUpdateHooks(
    entry as unknown as Record<string, unknown>,
    existing as unknown as Record<string, unknown>,
    principal
  ).catch(() => {});

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
  await prisma.entry.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
