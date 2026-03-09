// Export plugin — export entries in JSON, CSV, or Markdown formats

function buildWhere(searchParams) {
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const source = searchParams.get("source") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const where = {
    deletedAt: null,
    ...(type && { type }),
    ...(status && { status }),
    ...(source && { source }),
    ...(tag && { tags: { some: { name: tag } } }),
  };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  return where;
}

function pickFields(entry, fields, options) {
  const obj = {};

  for (const f of fields) {
    if (f === "content" && !options.includeContent) continue;
    if (f === "metadata" && !options.includeMetadata) continue;
    if (f === "comments" && !options.includeComments) continue;
    if (f === "images" && !options.includeImages) continue;
    if (f === "tags") {
      obj.tags = (entry.tags || []).map((t) => t.name);
    } else if (f === "comments") {
      obj.comments = (entry.comments || []).map((c) => ({
        author: c.author?.displayName || c.author?.username || "unknown",
        body: c.body,
        createdAt: c.createdAt,
      }));
    } else if (f === "images") {
      obj.images = (entry.images || []).map((img) => img.url);
    } else if (entry[f] !== undefined) {
      obj[f] = entry[f];
    }
  }

  return obj;
}

const ALL_FIELDS = [
  "id", "type", "source", "title", "summary", "content",
  "status", "url", "metadata", "tags", "images", "comments",
  "createdAt", "updatedAt",
];

function parseOptions(searchParams) {
  return {
    includeContent: searchParams.get("includeContent") !== "false",
    includeComments: searchParams.get("includeComments") === "true",
    includeImages: searchParams.get("includeImages") !== "false",
    includeMetadata: searchParams.get("includeMetadata") !== "false",
  };
}

function parseFields(searchParams) {
  const raw = searchParams.get("fields");
  if (!raw) return ALL_FIELDS;
  return raw.split(",").map((f) => f.trim()).filter((f) => ALL_FIELDS.includes(f));
}

function getIncludes(options) {
  return {
    tags: true,
    ...(options.includeComments && { comments: { include: { author: true } } }),
    ...(options.includeImages && { images: true }),
  };
}

function escCsv(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(entries, fields) {
  const header = fields.join(",");
  const rows = entries.map((e) =>
    fields.map((f) => {
      const v = e[f];
      if (Array.isArray(v)) return escCsv(v.join("|"));
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "object" && v !== null) return escCsv(JSON.stringify(v));
      return escCsv(v);
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function toMarkdown(entries) {
  return entries.map((e) => {
    const lines = [`# ${e.title || "(untitled)"}`];
    lines.push("");
    if (e.type) lines.push(`- **Type:** ${e.type}`);
    if (e.source) lines.push(`- **Source:** ${e.source}`);
    if (e.status) lines.push(`- **Status:** ${e.status}`);
    if (e.tags && e.tags.length) lines.push(`- **Tags:** ${e.tags.join(", ")}`);
    if (e.url) lines.push(`- **URL:** ${e.url}`);
    if (e.createdAt) lines.push(`- **Created:** ${e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt}`);
    if (e.images && e.images.length) {
      lines.push("");
      for (const img of e.images) lines.push(`![](${img})`);
    }
    if (e.summary) {
      lines.push("");
      lines.push(e.summary);
    }
    if (e.content) {
      lines.push("");
      lines.push("---");
      lines.push("");
      lines.push(e.content);
    }
    if (e.comments && e.comments.length) {
      lines.push("");
      lines.push("## Comments");
      lines.push("");
      for (const c of e.comments) {
        lines.push(`**${c.author}** (${c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt}):`);
        lines.push(c.body);
        lines.push("");
      }
    }
    return lines.join("\n");
  }).join("\n\n---\n\n");
}

function datestamp() {
  return new Date().toISOString().slice(0, 10);
}

function makeResponse(mapped, format, filenameBase, fields) {
  const stamp = datestamp();
  const name = filenameBase || "clawkb-export";

  if (format === "csv") {
    return new Response(toCsv(mapped, fields), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}-${stamp}.csv"`,
      },
    });
  }

  if (format === "markdown") {
    return new Response(toMarkdown(mapped), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}-${stamp}.md"`,
      },
    });
  }

  // Default: JSON
  return new Response(JSON.stringify(mapped, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${stamp}.json"`,
    },
  });
}

export const sidebar = {
  async register() {
    return [
      { id: "export", label: "Export", href: "/export" },
    ];
  },
};

export const api = {
  routes: [
    {
      method: "GET",
      path: "/export",
      description: "Export entries in JSON, CSV, or Markdown",
      async handler({ request, context }) {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get("format") || "json";
        const options = parseOptions(searchParams);
        const fields = parseFields(searchParams);
        const where = buildWhere(searchParams);

        const entries = await context.prisma.entry.findMany({
          where,
          include: getIncludes(options),
          orderBy: { createdAt: "desc" },
        });

        const mapped = entries.map((e) => pickFields(e, fields, options));
        return makeResponse(mapped, format, "clawkb-export", fields);
      },
    },
    {
      method: "GET",
      path: "/export/:id",
      description: "Export a single entry by ID",
      async handler({ params, request, context }) {
        const entryId = parseInt(params[0], 10);
        if (isNaN(entryId)) {
          return { status: 400, body: { error: "Invalid entry ID" } };
        }

        const { searchParams } = new URL(request.url);
        const format = searchParams.get("format") || "json";
        const options = parseOptions(searchParams);
        const fields = parseFields(searchParams);

        const entry = await context.prisma.entry.findFirst({
          where: { id: entryId, deletedAt: null },
          include: getIncludes(options),
        });

        if (!entry) {
          return { status: 404, body: { error: "Entry not found" } };
        }

        const mapped = [pickFields(entry, fields, options)];
        const slug = (entry.title || "entry").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
        return makeResponse(mapped, format, `clawkb-${entryId}-${slug}`, fields);
      },
    },
    {
      method: "GET",
      path: "/stats",
      description: "Preview stats for export filters",
      async handler({ request, context }) {
        const { searchParams } = new URL(request.url);
        const where = buildWhere(searchParams);

        const [count, byType, bySource, byStatus] = await Promise.all([
          context.prisma.entry.count({ where }),
          context.prisma.entry.groupBy({ by: ["type"], where, _count: { id: true } }),
          context.prisma.entry.groupBy({ by: ["source"], where, _count: { id: true } }),
          context.prisma.entry.groupBy({ by: ["status"], where, _count: { id: true } }),
        ]);

        const types = {};
        for (const t of byType) types[t.type] = t._count.id;
        const sources = {};
        for (const s of bySource) sources[s.source] = s._count.id;
        const statuses = {};
        for (const s of byStatus) statuses[s.status] = s._count.id;

        return { body: { count, types, sources, statuses } };
      },
    },
  ],
};
