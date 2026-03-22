import { NextResponse } from "next/server";
import { canCreateComment, getRequestPrincipal } from "@/lib/auth";
import { commentWithAuthorInclude, serializeComment } from "@/lib/entries";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { dispatchNotification } from "@/lib/notifications";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const comments = await prisma.entryComment.findMany({
    where: { entryId: Number(id) },
    include: commentWithAuthorInclude,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments: comments.map(serializeComment) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entryId = Number(id);
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canCreateComment(principal, entry.authorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const content = String(body.content || "").trim();
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const comment = await prisma.entryComment.create({
    data: {
      entryId,
      authorId: principal.id,
      content,
    },
    include: commentWithAuthorInclude,
  });

  logActivity("comment.created", principal.id, entryId, { commentId: comment.id, entryTitle: entry.title }).catch(() => {});
  dispatchWebhookEvent("comment.created", { id: comment.id, entryId, entryTitle: entry.title, authorId: principal.id });

  // Notify entry author about the comment (if different from commenter)
  if (entry.authorId && entry.authorId !== principal.id) {
    dispatchNotification(entry.authorId, {
      type: "comment",
      title: `${principal.displayName} commented on "${entry.title}"`,
      body: content.slice(0, 200),
      link: `/entries/${entryId}`,
    }).catch(() => {});
  }

  return NextResponse.json({ comment: serializeComment(comment) }, { status: 201 });
}
