import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getRequestPrincipal, jsonError } from "@/lib/auth";

// POST - Create a share link (optionally with linked entries)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const entryId = Number(id);
  if (isNaN(entryId)) return jsonError("Invalid entry ID", 400);

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.deletedAt) return jsonError("Entry not found", 404);

  const body = await request.json().catch(() => ({}));
  const { password, expiresInHours, maxViews, linkedEntryIds } = body as {
    password?: string;
    expiresInHours?: number;
    maxViews?: number;
    linkedEntryIds?: number[];
  };

  const token = crypto.randomBytes(32).toString("hex");
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;

  // Create main share link
  const shareLink = await prisma.shareLink.create({
    data: {
      token,
      entryId,
      createdById: principal.id!,
      passwordHash,
      expiresAt,
      maxViews: maxViews ?? null,
    },
  });

  // Create child share links for linked entries
  const childLinks: { entryId: number; token: string; title: string }[] = [];
  if (linkedEntryIds && linkedEntryIds.length > 0) {
    // Verify all linked entries exist
    const linkedEntries = await prisma.entry.findMany({
      where: { id: { in: linkedEntryIds }, deletedAt: null },
      select: { id: true, title: true },
    });

    for (const le of linkedEntries) {
      const childToken = crypto.randomBytes(32).toString("hex");
      await prisma.shareLink.create({
        data: {
          token: childToken,
          entryId: le.id,
          createdById: principal.id!,
          parentId: shareLink.id,
          passwordHash, // inherit same password
          expiresAt,    // inherit same expiry
          maxViews: null,
        },
      });
      childLinks.push({ entryId: le.id, token: childToken, title: le.title });
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3500";

  return NextResponse.json({
    id: shareLink.id,
    token: shareLink.token,
    url: `${baseUrl}/share/${shareLink.token}`,
    expiresAt: shareLink.expiresAt?.toISOString() ?? null,
    maxViews: shareLink.maxViews,
    createdAt: shareLink.createdAt.toISOString(),
    linkedShares: childLinks.map((c) => ({
      entryId: c.entryId,
      token: c.token,
      title: c.title,
      url: `${baseUrl}/share/${c.token}`,
    })),
  });
}

// GET - List active share links for an entry (only top-level, not children)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const entryId = Number(id);
  if (isNaN(entryId)) return jsonError("Invalid entry ID", 400);

  const links = await prisma.shareLink.findMany({
    where: { entryId, revokedAt: null, parentId: null },
    include: {
      children: {
        where: { revokedAt: null },
        include: { entry: { select: { id: true, title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3500";

  return NextResponse.json(
    links.map((link) => ({
      id: link.id,
      token: link.token,
      url: `${baseUrl}/share/${link.token}`,
      hasPassword: !!link.passwordHash,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      maxViews: link.maxViews,
      viewCount: link.viewCount,
      createdAt: link.createdAt.toISOString(),
      linkedShares: link.children.map((c) => ({
        entryId: c.entry.id,
        title: c.entry.title,
        token: c.token,
      })),
    }))
  );
}
