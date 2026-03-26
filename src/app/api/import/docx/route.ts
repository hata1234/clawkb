import { NextResponse } from "next/server";
import { canCreateEntries, getRequestPrincipal } from "@/lib/auth";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, readdirSync } from "fs";

const execFileAsync = promisify(execFile);

interface ConvertedDoc {
  title: string;
  content: string;
  images: { name: string; base64: string; mime: string }[];
}

export async function POST(request: Request) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateEntries(principal)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > 20) {
    return NextResponse.json({ error: "Maximum 20 files per upload" }, { status: 400 });
  }

  const results: ConvertedDoc[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx" && ext !== "doc") {
      errors.push(`${file.name}: unsupported format (only .docx/.doc)`);
      continue;
    }

    // Size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      errors.push(`${file.name}: file too large (max 50MB)`);
      continue;
    }

    const workDir = join(tmpdir(), `clawkb-docx-${randomUUID()}`);
    const mediaDir = join(workDir, "media");

    try {
      await mkdir(mediaDir, { recursive: true });

      // Write uploaded file to temp
      const buffer = Buffer.from(await file.arrayBuffer());
      const inputPath = join(workDir, file.name);
      await writeFile(inputPath, buffer);

      // Run pandoc: docx → markdown with extracted media
      const { stdout, stderr } = await execFileAsync("pandoc", [
        inputPath,
        "-f", "docx",
        "-t", "gfm",
        "--wrap=none",
        `--extract-media=${mediaDir}`,
        "--standalone",
      ], { timeout: 30000, maxBuffer: 20 * 1024 * 1024 });

      if (stderr && !stderr.includes("[WARNING]")) {
        console.warn(`pandoc stderr for ${file.name}:`, stderr);
      }

      let markdown = stdout;

      // Extract title from first heading or filename
      const headingMatch = markdown.match(/^#\s+(.+)$/m);
      let title = headingMatch ? headingMatch[1].trim() : file.name.replace(/\.(docx?|doc)$/i, "");

      // Remove YAML front matter if pandoc added it
      markdown = markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();

      // Collect extracted images and convert to base64
      const images: ConvertedDoc["images"] = [];
      if (existsSync(mediaDir)) {
        const walkDir = (dir: string) => {
          try {
            const items = readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
              const fullPath = join(dir, item.name);
              if (item.isDirectory()) {
                walkDir(fullPath);
              } else if (/\.(png|jpe?g|gif|svg|webp|bmp|tiff?)$/i.test(item.name)) {
                try {
                  const imgBuf = require("fs").readFileSync(fullPath);
                  const extMap: Record<string, string> = {
                    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
                    gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
                    bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff",
                  };
                  const imgExt = item.name.split(".").pop()?.toLowerCase() || "png";
                  images.push({
                    name: item.name,
                    base64: imgBuf.toString("base64"),
                    mime: extMap[imgExt] || "image/png",
                  });
                } catch { /* skip unreadable images */ }
              }
            }
          } catch { /* skip unreadable dirs */ }
        };
        walkDir(mediaDir);
      }

      // Replace local media paths with data URIs or placeholder
      for (const img of images) {
        // pandoc outputs paths like media/image1.png or ./media/image1.png
        const patterns = [
          new RegExp(`!\\[([^\\]]*)\\]\\([^)]*${img.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, "g"),
        ];
        for (const pattern of patterns) {
          markdown = markdown.replace(pattern, `![$1](data:${img.mime};base64,${img.base64})`);
        }
      }

      results.push({ title, content: markdown, images });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "conversion failed";
      errors.push(`${file.name}: ${msg}`);
    } finally {
      // Cleanup
      try { await rm(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ documents: results, errors });
}
