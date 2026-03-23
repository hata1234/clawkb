import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { canEditEntry } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; flowId: string }> }) {
  const principal = await getRequestPrincipal(_request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, flowId } = await params;
  const flow = await prisma.entryFlow.findFirst({
    where: { id: parseInt(flowId), entryId: parseInt(id) },
  });

  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(flow);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; flowId: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, flowId } = await params;
  const entryId = parseInt(id);

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { collections: { select: { id: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const allowed = await canEditEntry(principal.id, { authorId: entry.authorId, collections: entry.collections }, principal.isAdmin);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, bpmnXml, sortOrder } = body as { name?: string; bpmnXml?: string; sortOrder?: number };

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (bpmnXml !== undefined) data.bpmnXml = bpmnXml;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const flow = await prisma.entryFlow.update({
    where: { id: parseInt(flowId) },
    data,
  });

  return NextResponse.json(flow);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; flowId: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, flowId } = await params;
  const entryId = parseInt(id);

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { collections: { select: { id: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const allowed = await canEditEntry(principal.id, { authorId: entry.authorId, collections: entry.collections }, principal.isAdmin);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.entryFlow.delete({ where: { id: parseInt(flowId) } });
  return NextResponse.json({ ok: true });
}
