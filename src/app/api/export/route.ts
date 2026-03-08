import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authed = await authenticateApi(request);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const source = searchParams.get("source") || undefined;
  const tag = searchParams.get("tag") || undefined;

  const entries = await prisma.entry.findMany({
    where: {
      ...(type && { type }),
      ...(status && { status }),
      ...(source && { source }),
      ...(tag && { tags: { some: { name: tag } } }),
    },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });

  if (format === "csv") {
    const headers = ["id", "type", "source", "title", "summary", "status", "url", "tags", "createdAt"];
    const rows = entries.map(e => [
      e.id,
      e.type,
      e.source,
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${(e.summary || "").replace(/"/g, '""')}"`,
      e.status,
      e.url || "",
      e.tags.map(t => t.name).join("|"),
      e.createdAt.toISOString(),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="knowledge-hub-export-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(entries, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="knowledge-hub-export-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}
