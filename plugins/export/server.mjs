// Export plugin — export entries in JSON, CSV, Markdown, or PDF formats

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

// ── CJK font auto-download + cache ──────────────────────────────────

const FONT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/TC/NotoSansCJKtc-Regular.otf";

async function resolveFontPath() {
  const fs = await import("fs");
  const path = await import("path");

  // 1. Check settings-configured path
  const settingsPath = path.join(process.cwd(), "data", "settings.json");
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    if (settings.pdfFontPath && fs.existsSync(settings.pdfFontPath)) {
      return settings.pdfFontPath;
    }
  } catch {}

  // 2. Default cache location
  const cacheDir = path.join(process.cwd(), "data", "fonts");
  const cachedFont = path.join(cacheDir, "NotoSansCJKtc-Regular.otf");

  if (fs.existsSync(cachedFont)) return cachedFont;

  // 3. Auto-download
  console.log("[export] Downloading CJK font from CDN…");
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    const res = await fetch(FONT_CDN_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(cachedFont, buf);
    console.log(`[export] CJK font cached at ${cachedFont} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
    return cachedFont;
  } catch (err) {
    console.error("[export] Failed to download CJK font:", err.message);
    return null;
  }
}

// ── PDF generation ──────────────────────────────────────────────────

async function toPdf(entries, password) {
  const { jsPDF } = await import("jspdf");
  const fs = await import("fs");
  const path = await import("path");

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Load CJK font (auto-downloaded if needed)
  const fontPath = await resolveFontPath();
  let fontFamily = "helvetica";
  let cjkMissing = false;

  if (fontPath) {
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString("base64");
    const fontFileName = path.basename(fontPath);
    doc.addFileToVFS(fontFileName, fontBase64);
    doc.addFont(fontFileName, "NotoSansTC", "normal");
    doc.addFont(fontFileName, "NotoSansTC", "bold");
    doc.addFont(fontFileName, "NotoSansTC", "italic");
    doc.addFont(fontFileName, "NotoSansTC", "bolditalic");
    doc.setFont("NotoSansTC");
    fontFamily = "NotoSansTC";
  } else {
    cjkMissing = true;
    doc.setFont("helvetica");
  }
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = { top: 56, bottom: 56, left: 56, right: 56 };
  const contentW = pageW - margin.left - margin.right;

  let y = margin.top;

  function ensureSpace(needed) {
    if (y + needed > pageH - margin.bottom) {
      doc.addPage();
      y = margin.top;
    }
  }

  function drawLine() {
    ensureSpace(16);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin.left, y, pageW - margin.right, y);
    y += 12;
  }

  function writeText(text, opts = {}) {
    const {
      fontSize = 10,
      fontStyle = "normal",
      color = [51, 51, 51],
      indent = 0,
      lineHeight = 1.5,
      fontName = fontFamily,
    } = opts;

    doc.setFont(fontName, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    const maxW = contentW - indent;
    const lines = doc.splitTextToSize(text, maxW);
    const lh = fontSize * lineHeight;

    for (const line of lines) {
      ensureSpace(lh);
      doc.text(line, margin.left + indent, y);
      y += lh;
    }
  }

  // Parse markdown into styled segments and render
  function renderMarkdown(md) {
    const lines = md.split("\n");
    let inCodeBlock = false;
    let inTable = false;
    let tableRows = [];

    function flushTable() {
      if (tableRows.length === 0) return;
      const cols = tableRows[0].length;
      const colW = contentW / cols;
      const cellPad = 4;

      for (let r = 0; r < tableRows.length; r++) {
        const row = tableRows[r];
        const isHeader = r === 0;

        // Calculate row height
        doc.setFont(fontFamily, isHeader ? "bold" : "normal");
        doc.setFontSize(9);
        let maxH = 14;
        for (let c = 0; c < row.length; c++) {
          const cellLines = doc.splitTextToSize(row[c].trim(), colW - cellPad * 2);
          maxH = Math.max(maxH, cellLines.length * 13 + cellPad * 2);
        }

        ensureSpace(maxH);

        // Draw cells
        for (let c = 0; c < row.length; c++) {
          const cx = margin.left + c * colW;
          if (isHeader) {
            doc.setFillColor(240, 240, 240);
            doc.rect(cx, y - 10, colW, maxH, "F");
          }
          doc.setDrawColor(200, 200, 200);
          doc.rect(cx, y - 10, colW, maxH, "S");
          doc.setFont(fontFamily, isHeader ? "bold" : "normal");
          doc.setFontSize(9);
          doc.setTextColor(51, 51, 51);
          const cellLines = doc.splitTextToSize(row[c].trim(), colW - cellPad * 2);
          for (let l = 0; l < cellLines.length; l++) {
            doc.text(cellLines[l], cx + cellPad, y + l * 13);
          }
        }
        y += maxH;
      }
      y += 6;
      tableRows = [];
      inTable = false;
    }

    for (const raw of lines) {
      const line = raw;

      // Code block toggle
      if (line.trimStart().startsWith("```")) {
        if (inTable) flushTable();
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) y += 4;
        else y += 4;
        continue;
      }

      if (inCodeBlock) {
        ensureSpace(14);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin.left, y - 10, contentW, 14, "F");
        writeText(line || " ", { fontSize: 9, fontName: fontFamily, color: [80, 80, 80], lineHeight: 1.3 });
        continue;
      }

      // Table rows
      if (line.includes("|") && line.trim().startsWith("|")) {
        // Skip separator rows like |---|---|
        if (/^\|[\s\-:]+\|/.test(line.trim()) && !line.replace(/[\|\s\-:]/g, "").length) {
          continue;
        }
        inTable = true;
        const cells = line.split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!line.trim()) {
        y += 8;
        continue;
      }

      // Headers
      const hMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2].replace(/[*_`]/g, "");
        const sizes = [22, 18, 15, 13, 11, 10];
        y += level <= 2 ? 12 : 6;
        writeText(text, { fontSize: sizes[level - 1] || 10, fontStyle: "bold", color: [30, 30, 30] });
        y += 4;
        continue;
      }

      // Bullet lists
      const bulletMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)/);
      if (bulletMatch) {
        const depth = Math.floor(bulletMatch[1].length / 2);
        const bullet = bulletMatch[2].match(/\d/) ? bulletMatch[2] : "\u2022";
        const text = bulletMatch[3];
        const indent = 16 + depth * 16;
        ensureSpace(15);
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text(bullet, margin.left + indent - 10, y);
        renderInlineFormatting(text, indent);
        continue;
      }

      // Horizontal rule
      if (/^[-*_]{3,}\s*$/.test(line.trim())) {
        drawLine();
        continue;
      }

      // Blockquote
      if (line.trimStart().startsWith(">")) {
        const text = line.replace(/^>\s*/, "");
        ensureSpace(16);
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(2);
        doc.line(margin.left + 4, y - 10, margin.left + 4, y + 4);
        writeText(text, { indent: 16, color: [100, 100, 100], fontStyle: "italic" });
        continue;
      }

      // Regular paragraph with inline formatting
      renderInlineFormatting(line, 0);
    }

    if (inTable) flushTable();
  }

  function renderInlineFormatting(text, indent) {
    // Strip markdown links to just text, strip images
    let clean = text.replace(/!\[.*?\]\(.*?\)/g, "[image]");
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Handle bold and italic
    const hasBold = /\*\*(.+?)\*\*/.test(clean) || /__(.+?)__/.test(clean);
    const hasItalic = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/.test(clean) || /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/.test(clean);

    // For simplicity, strip markdown formatting and detect style
    clean = clean.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
    clean = clean.replace(/\*(.+?)\*/g, "$1").replace(/_(.+?)_/g, "$1");
    clean = clean.replace(/`(.+?)`/g, "$1");
    clean = clean.replace(/~~(.+?)~~/g, "$1");

    const style = hasBold && hasItalic ? "bolditalic" : hasBold ? "bold" : hasItalic ? "italic" : "normal";
    writeText(clean, { indent, fontStyle: style });
  }

  // Render each entry
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];

    if (i > 0) {
      doc.addPage();
      y = margin.top;
    }

    // Title
    writeText(e.title || "(untitled)", { fontSize: 24, fontStyle: "bold", color: [20, 20, 20], lineHeight: 1.3 });
    y += 8;

    // Metadata
    const meta = [];
    if (e.type) meta.push(["Type", e.type]);
    if (e.source) meta.push(["Source", e.source]);
    if (e.status) meta.push(["Status", e.status.replace(/_/g, " ")]);
    if (e.tags && e.tags.length) meta.push(["Tags", Array.isArray(e.tags) ? e.tags.join(", ") : e.tags]);
    if (e.createdAt) {
      const d = e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt);
      meta.push(["Created", d.slice(0, 10)]);
    }
    if (e.url) meta.push(["URL", e.url]);

    if (meta.length) {
      doc.setFillColor(248, 248, 248);
      const metaH = meta.length * 16 + 16;
      ensureSpace(metaH);
      doc.roundedRect(margin.left, y - 4, contentW, metaH, 4, 4, "F");
      y += 8;
      for (const [label, value] of meta) {
        writeText(`${label}:  ${value}`, { fontSize: 9, color: [100, 100, 100], indent: 8 });
      }
      y += 8;
    }

    // Summary
    if (e.summary) {
      y += 8;
      writeText("Summary", { fontSize: 11, fontStyle: "bold", color: [80, 80, 80] });
      y += 2;
      writeText(e.summary, { fontSize: 10, color: [70, 70, 70], fontStyle: "italic" });
      y += 8;
    }

    // Content
    if (e.content) {
      drawLine();
      y += 4;
      renderMarkdown(e.content);
    }

    // Comments
    if (e.comments && e.comments.length) {
      y += 12;
      drawLine();
      writeText("Comments", { fontSize: 14, fontStyle: "bold", color: [30, 30, 30] });
      y += 8;
      for (const c of e.comments) {
        const when = c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt);
        writeText(`${c.author} — ${when.slice(0, 10)}`, { fontSize: 9, fontStyle: "bold", color: [100, 100, 100] });
        writeText(c.body, { fontSize: 10, indent: 8 });
        y += 8;
      }
    }

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`ClawKB Export — ${datestamp()}`, margin.left, pageH - 28);
      doc.text(`Page ${p} of ${totalPages}`, pageW - margin.right - 60, pageH - 28);
    }
  }

  // Add CJK fallback notice if font was unavailable
  if (cjkMissing) {
    doc.setPage(1);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(180, 80, 80);
    doc.text(
      "Note: CJK characters may not display correctly. Configure a CJK font in Settings > Export.",
      margin.left,
      pageH - 14,
    );
  }

  let pdfBytes = doc.output("arraybuffer");

  // Encrypt with password if provided (pure JS — no external binary needed)
  if (password) {
    const { PDFDocument } = await import("pdf-lib-with-encrypt");
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfBytes = await pdfDoc.save({
      userPassword: password,
      ownerPassword: password,
    });
  }

  return pdfBytes;
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

  // PDF — handled separately (async), should not reach here
  // See makePdfResponse below

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

        if (format === "pdf") {
          const password = searchParams.get("password") || undefined;
          const pdfBytes = await toPdf(mapped, password);
          return new Response(pdfBytes, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="clawkb-export-${datestamp()}.pdf"`,
            },
          });
        }

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
        const baseName = `clawkb-${entryId}-${slug}`;

        if (format === "pdf") {
          const password = searchParams.get("password") || undefined;
          const pdfBytes = await toPdf(mapped, password);
          return new Response(pdfBytes, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${baseName}-${datestamp()}.pdf"`,
            },
          });
        }

        return makeResponse(mapped, format, baseName, fields);
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
    {
      method: "GET",
      path: "/options",
      description: "Get distinct filter values for combobox dropdowns",
      async handler({ context }) {
        const where = { deletedAt: null };

        const [byType, bySource, byStatus, tags] = await Promise.all([
          context.prisma.entry.groupBy({ by: ["type"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
          context.prisma.entry.groupBy({ by: ["source"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
          context.prisma.entry.groupBy({ by: ["status"], where, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
          context.prisma.tag.findMany({ select: { name: true, _count: { select: { entries: true } } }, orderBy: { entries: { _count: "desc" } }, take: 100 }),
        ]);

        return {
          body: {
            types: byType.map((t) => ({ value: t.type, count: t._count.id })),
            sources: bySource.map((s) => ({ value: s.source, count: s._count.id })),
            statuses: byStatus.map((s) => ({ value: s.status, count: s._count.id })),
            tags: tags.map((t) => ({ value: t.name, count: t._count.entries })),
          },
        };
      },
    },
  ],
};
