import { NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { canEditEntry } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id);

  const flows = await prisma.entryFlow.findMany({
    where: { entryId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(flows);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id);

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { collections: { select: { id: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const allowed = await canEditEntry(principal.id, { authorId: entry.authorId, collections: entry.collections }, principal.isAdmin);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, bpmnXml } = body as { name?: string; bpmnXml?: string };

  // Get next sort order
  const maxSort = await prisma.entryFlow.aggregate({
    where: { entryId },
    _max: { sortOrder: true },
  });

  const flow = await prisma.entryFlow.create({
    data: {
      entryId,
      name: name || "",
      bpmnXml: bpmnXml || '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"><bpmn:process id="Process_1" isExecutable="false"><bpmn:startEvent id="StartEvent_1"/></bpmn:process><bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"><bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1"><dc:Bounds xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" x="173" y="102" width="36" height="36"/></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>',
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(flow, { status: 201 });
}
