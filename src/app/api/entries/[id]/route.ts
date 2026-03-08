import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: { id: parseInt(id) },
    include: { tags: true, images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { type, source, title, summary, content, status, url, tags, metadata, addImages, removeImageIds } = body;

  const existing = await prisma.entry.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
          tags.map((name: string) =>
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
      ...(metadata !== undefined && { metadata }),
      ...(tagConnect && { tags: tagConnect }),
      ...(addImages && addImages.length > 0 && {
        images: {
          create: addImages.map((img: { url: string; key: string; filename: string; mimeType?: string; size?: number; caption?: string }, i: number) => ({
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

  return NextResponse.json(entry);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.entry.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
