import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { canCreateEntries, getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndStoreChunks } from "@/lib/embedding";
import { runEntryAfterCreateHooks, runEntryBeforeCreateHooks } from "@/lib/plugins/manager";
import { logActivity } from "@/lib/activity";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { entryWithAuthorInclude } from "@/lib/entries";

interface ImportEntry {
  title: string;
  content?: string | null;
  body?: string | null; // alias for content
  summary?: string | null;
  tags?: string[];
  type?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  url?: string | null;
}

interface ImportPayload {
  entries: ImportEntry[];
  defaultTags?: string[];
  defaultCollectionId?: number | null;
  duplicateHandling?: "skip" | "overwrite" | "create_new";
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let payload: ImportPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { entries, defaultTags = [], defaultCollectionId, duplicateHandling = "skip" } = payload;

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries array is required and must not be empty" }, { status: 400 });
  }

  if (entries.length > 500) {
    return NextResponse.json({ error: "Maximum 500 entries per import" }, { status: 400 });
  }

  const results = { created: 0, skipped: 0, overwritten: 0, errors: [] as string[] };

  // Pre-fetch existing titles for duplicate detection
  const titles = entries.map((e) => e.title).filter(Boolean);
  const existingEntries = await prisma.entry.findMany({
    where: { title: { in: titles }, deletedAt: null },
    select: { id: true, title: true },
  });
  const existingByTitle = new Map(existingEntries.map((e) => [e.title.toLowerCase(), e.id]));

  for (let i = 0; i < entries.length; i++) {
    const raw = entries[i];
    try {
      if (!raw.title || !raw.title.trim()) {
        results.errors.push(`Entry ${i + 1}: title is required`);
        continue;
      }

      const content = raw.content ?? raw.body ?? null;
      const tags = [...(raw.tags || []), ...defaultTags].filter(Boolean);
      const entryType = raw.type || "entry";
      const status = raw.status || "new";

      // Duplicate check
      const existingId = existingByTitle.get(raw.title.toLowerCase().trim());
      if (existingId) {
        if (duplicateHandling === "skip") {
          results.skipped++;
          continue;
        }
        if (duplicateHandling === "overwrite") {
          // Update existing entry
          const tagRecords = tags.length > 0
            ? await Promise.all(tags.map((name) => prisma.tag.upsert({ where: { name }, update: {}, create: { name } })))
            : [];

          const updated = await prisma.entry.update({
            where: { id: existingId },
            data: {
              type: entryType,
              source: "import",
              summary: raw.summary || null,
              content: content || null,
              status,
              url: raw.url || null,
              metadata: (raw.metadata || {}) as Prisma.InputJsonValue,
              tags: { set: tagRecords.map((t) => ({ id: t.id })) },
              ...(defaultCollectionId && {
                collections: { connect: [{ id: defaultCollectionId }] },
              }),
            },
            include: entryWithAuthorInclude,
          });

          generateAndStoreChunks(updated).catch(() => {});
          results.overwritten++;
          continue;
        }
        // "create_new" falls through to create
      }

      // Run before-create hooks
      const hookedBody = await runEntryBeforeCreateHooks(
        { type: entryType, source: "import", title: raw.title.trim(), summary: raw.summary || null, content, status, url: raw.url || null, tags, metadata: raw.metadata || {} } as Record<string, unknown>,
        principal
      ) as Record<string, unknown>;

      const finalTags = (hookedBody.tags as string[] | undefined) || tags;
      const tagRecords = finalTags.length > 0
        ? await Promise.all(finalTags.map((name) => prisma.tag.upsert({ where: { name }, update: {}, create: { name } })))
        : [];

      const entry = await prisma.entry.create({
        data: {
          type: (hookedBody.type as string) || entryType,
          source: "import",
          title: (hookedBody.title as string) || raw.title.trim(),
          summary: (hookedBody.summary as string | null) ?? raw.summary ?? null,
          content: (hookedBody.content as string | null) ?? content ?? null,
          status: (hookedBody.status as string) || status,
          url: (hookedBody.url as string | null) ?? raw.url ?? null,
          metadata: ((hookedBody.metadata as Record<string, unknown>) || raw.metadata || {}) as Prisma.InputJsonValue,
          authorId: principal.id,
          tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
          ...(defaultCollectionId && {
            collections: { connect: [{ id: defaultCollectionId }] },
          }),
        },
        include: entryWithAuthorInclude,
      });

      // Fire-and-forget async operations
      generateAndStoreChunks(entry).catch(() => {});
      runEntryAfterCreateHooks(entry as unknown as Record<string, unknown>, hookedBody, principal).catch(() => {});
      logActivity("entry.created", principal.id, entry.id, { title: entry.title, source: "import" }).catch(() => {});
      dispatchWebhookEvent("entry.created", { id: entry.id, title: entry.title, type: entry.type, source: "import" });

      results.created++;
    } catch (err) {
      results.errors.push(`Entry ${i + 1} ("${raw.title || "untitled"}"): ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json(results, { status: 200 });
}
