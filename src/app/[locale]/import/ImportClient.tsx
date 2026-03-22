"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from 'next-intl';
import { Upload, FileText, FileSpreadsheet, FileCode, Loader2, X, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

/* ─── types ─── */

interface ParsedEntry {
  title: string;
  content?: string | null;
  summary?: string | null;
  tags?: string[];
  type?: string;
  status?: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
}

interface ImportResults {
  created: number;
  skipped: number;
  overwritten: number;
  errors: string[];
}

type DuplicateHandling = "skip" | "overwrite" | "create_new";

/* ─── styles ─── */

const sectionStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)",
  padding: 24,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "var(--text-secondary)",
  fontSize: "0.8rem",
  fontWeight: 500,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: "0.85rem",
  cursor: "pointer",
  appearance: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontSize: "0.85rem",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 24px",
  background: "var(--accent-muted)",
  color: "var(--accent)",
  border: "1px solid var(--accent)",
  borderRadius: "var(--radius-sm)",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const btnSecondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 24px",
  background: "var(--surface)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

/* ─── CSV parser ─── */

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): ParsedEntry[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const titleIdx = headers.indexOf("title");
  if (titleIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const entry: ParsedEntry = { title: vals[titleIdx] || "" };
    headers.forEach((h, i) => {
      if (h === "title") return;
      const v = vals[i] || "";
      if (!v) return;
      if (h === "content" || h === "body") entry.content = v;
      else if (h === "summary") entry.summary = v;
      else if (h === "tags") entry.tags = v.split(";").map((t) => t.trim()).filter(Boolean);
      else if (h === "type") entry.type = v;
      else if (h === "status") entry.status = v;
      else if (h === "url") entry.url = v;
    });
    return entry;
  }).filter((e) => e.title.trim());
}

function parseJSON(text: string): ParsedEntry[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.entries ? data.entries : [data];
  return arr.map((item: Record<string, unknown>) => ({
    title: (item.title as string) || "",
    content: (item.content as string) ?? (item.body as string) ?? null,
    summary: (item.summary as string) ?? null,
    tags: Array.isArray(item.tags) ? item.tags.filter((t: unknown) => typeof t === "string") : undefined,
    type: (item.type as string) ?? undefined,
    status: (item.status as string) ?? undefined,
    url: (item.url as string) ?? null,
    metadata: typeof item.metadata === "object" && item.metadata ? item.metadata as Record<string, unknown> : undefined,
  })).filter((e: ParsedEntry) => e.title.trim());
}

function parseMarkdown(filename: string, text: string): ParsedEntry {
  // Extract title from first # heading or filename
  const headingMatch = text.match(/^#\s+(.+)$/m);
  let title = headingMatch ? headingMatch[1].trim() : filename.replace(/\.md$/i, "");
  let content = text;
  if (headingMatch) {
    content = text.replace(/^#\s+.+\n?/, "").trim();
  }
  return { title, content };
}

/* ─── Component ─── */

export default function ImportClient() {
  const t = useTranslations('Import');
  const tc = useTranslations('Common');
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<ParsedEntry[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>("skip");
  const [defaultTags, setDefaultTags] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFiles([]);
    setParsed([]);
    setParseError(null);
    setResults(null);
    setProgress(0);
  }, []);

  const processFiles = useCallback(async (fileList: File[]) => {
    setParseError(null);
    setResults(null);
    setProgress(0);
    setFiles(fileList);

    const allEntries: ParsedEntry[] = [];
    for (const file of fileList) {
      try {
        const text = await file.text();
        const ext = file.name.split(".").pop()?.toLowerCase();

        if (ext === "json") {
          allEntries.push(...parseJSON(text));
        } else if (ext === "csv") {
          allEntries.push(...parseCSV(text));
        } else if (ext === "md" || ext === "markdown") {
          allEntries.push(parseMarkdown(file.name, text));
        } else {
          setParseError(t('unsupportedFileType', { name: file.name }));
        }
      } catch (err) {
        setParseError(t('failedToParse', { name: file.name, error: err instanceof Error ? err.message : "unknown error" }));
      }
    }
    setParsed(allEntries);
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(md|markdown|json|csv)$/i.test(f.name)
    );
    if (droppedFiles.length > 0) processFiles(droppedFiles);
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) processFiles(selected);
  }, [processFiles]);

  const removeEntry = useCallback((idx: number) => {
    setParsed((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const doImport = useCallback(async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setProgress(0);
    setResults(null);

    const tags = defaultTags.split(",").map((s) => s.trim()).filter(Boolean);
    const batchSize = 50;
    const totalBatches = Math.ceil(parsed.length / batchSize);
    const combined: ImportResults = { created: 0, skipped: 0, overwritten: 0, errors: [] };

    for (let b = 0; b < totalBatches; b++) {
      const batch = parsed.slice(b * batchSize, (b + 1) * batchSize);
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries: batch,
            defaultTags: tags,
            duplicateHandling,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          combined.errors.push(data.error || t('batchFailed', { batch: b + 1 }));
        } else {
          combined.created += data.created || 0;
          combined.skipped += data.skipped || 0;
          combined.overwritten += data.overwritten || 0;
          combined.errors.push(...(data.errors || []));
        }
      } catch (err) {
        combined.errors.push(t('batchNetworkError', { batch: b + 1 }));
      }
      setProgress(Math.round(((b + 1) / totalBatches) * 100));
    }

    setResults(combined);
    setImporting(false);
  }, [parsed, defaultTags, duplicateHandling, t]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--text)", marginBottom: 8 }}>
        {t('importEntries')}
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 32 }}>
        {t('importDescription')}
      </p>

      {/* Upload area */}
      {!results && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...sectionStyle,
            border: dragOver ? "2px dashed var(--accent)" : "2px dashed var(--border)",
            background: dragOver ? "var(--accent-muted)" : "var(--surface)",
            textAlign: "center",
            cursor: "pointer",
            padding: 48,
            marginBottom: 24,
            transition: "all 0.15s ease",
          }}
        >
          <Upload style={{ width: 40, height: 40, color: "var(--text-dim)", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text)", fontSize: "0.95rem", fontWeight: 500, marginBottom: 8 }}>
            {t('dropFilesHere')}
          </p>
          <p style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
            {t('supportedFormats')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.markdown,.json,.csv"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div style={{ ...sectionStyle, borderColor: "var(--danger)", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle style={{ width: 18, height: 18, color: "var(--danger)", flexShrink: 0 }} />
          <span style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{parseError}</span>
        </div>
      )}

      {/* Files loaded */}
      {files.length > 0 && !results && (
        <div style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {files.map((f, i) => {
            const ext = f.name.split(".").pop()?.toLowerCase();
            const Icon = ext === "json" ? FileCode : ext === "csv" ? FileSpreadsheet : FileText;
            return (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {f.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Options */}
      {parsed.length > 0 && !results && (
        <div style={{ ...sectionStyle, marginBottom: 24 }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            {t('importOptions')}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <label style={labelStyle}>{t('duplicateHandling')}</label>
              <div style={{ position: "relative" }}>
                <select
                  value={duplicateHandling}
                  onChange={(e) => setDuplicateHandling(e.target.value as DuplicateHandling)}
                  style={selectStyle}
                >
                  <option value="skip">{t('skipDuplicates')}</option>
                  <option value="overwrite">{t('overwriteExisting')}</option>
                  <option value="create_new">{t('createNewAllowDuplicates')}</option>
                </select>
                <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-dim)", pointerEvents: "none" }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t('defaultTags')}</label>
              <input
                type="text"
                value={defaultTags}
                onChange={(e) => setDefaultTags(e.target.value)}
                placeholder={t('defaultTagsPlaceholder')}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview table */}
      {parsed.length > 0 && !results && (
        <div style={{ ...sectionStyle, marginBottom: 24, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
              {t('preview')} — {t('entriesCount', { count: parsed.length })}
            </h3>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 500, width: 40 }}>#</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 500 }}>{t('title')}</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 500 }}>{t('type')}</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 500 }}>{t('tags')}</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 500 }}>{t('contentColumn')}</th>
                  <th style={{ padding: "10px 8px", width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((entry, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 16px", color: "var(--text-dim)" }}>{i + 1}</td>
                    <td style={{ padding: "10px 16px", color: "var(--text)", fontWeight: 500, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.title}
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-secondary)" }}>
                      {entry.type || "entry"}
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-secondary)" }}>
                      {entry.tags?.join(", ") || "—"}
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.content ? `${entry.content.slice(0, 80)}${entry.content.length > 80 ? "…" : ""}` : "—"}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <button
                        onClick={() => removeEntry(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 4 }}
                        title={tc('remove')}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {importing && (
        <div style={{ ...sectionStyle, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <Loader2 style={{ width: 20, height: 20, color: "var(--accent)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 500 }}>{t('importing')}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: 999, transition: "width 0.3s ease" }} />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ ...sectionStyle, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <CheckCircle2 style={{ width: 24, height: 24, color: "var(--success)" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>{t('importComplete')}</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: results.errors.length > 0 ? 16 : 0 }}>
            <div style={{ textAlign: "center", padding: 16, background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)" }}>{results.created}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>{t('created')}</div>
            </div>
            <div style={{ textAlign: "center", padding: 16, background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--warning)" }}>{results.skipped + results.overwritten}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                {results.overwritten > 0 ? t('skippedAndOverwritten', { skipped: results.skipped, overwritten: results.overwritten }) : t('skipped')}
              </div>
            </div>
            <div style={{ textAlign: "center", padding: 16, background: "var(--background)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: results.errors.length > 0 ? "var(--danger)" : "var(--text-dim)" }}>{results.errors.length}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>{t('errors')}</div>
            </div>
          </div>
          {results.errors.length > 0 && (
            <div style={{ maxHeight: 150, overflowY: "auto", padding: 12, background: "var(--background)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              {results.errors.map((e, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: "var(--danger)", marginBottom: 4 }}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        {parsed.length > 0 && !results && !importing && (
          <button onClick={doImport} style={btnPrimary}>
            <Upload style={{ width: 16, height: 16 }} />
            {t('importButton', { count: parsed.length })}
          </button>
        )}
        {(parsed.length > 0 || results) && !importing && (
          <button onClick={resetState} style={btnSecondary}>
            {t('startOver')}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
