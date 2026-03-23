"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, FileSpreadsheet, FileCode, Loader2, ChevronDown, X, Search } from "lucide-react";

/* ─── types ─── */

interface Stats {
  count: number;
  types: Record<string, number>;
  sources: Record<string, number>;
  statuses: Record<string, number>;
}

interface OptionItem {
  value: string;
  count: number;
}

interface FilterOptions {
  types: OptionItem[];
  sources: OptionItem[];
  statuses: OptionItem[];
  tags: OptionItem[];
}

type Format = "json" | "csv" | "markdown";

/* ─── styles ─── */

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  color: "var(--text-secondary)",
  fontSize: "0.8rem",
  fontWeight: 500,
};

const sectionStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)",
  padding: 24,
};

/* ─── Combobox ─── */

function Combobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: OptionItem[];
  placeholder: string;
}) {
  const t = useTranslations("Export");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((o) => o.value.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "var(--background)",
          border: open ? "1px solid var(--accent)" : "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "10px 12px",
          fontSize: "0.875rem",
          color: value ? "var(--text)" : "var(--text-dim)",
          cursor: "pointer",
          boxSizing: "border-box",
          textAlign: "left",
          transition: "border-color 0.15s ease",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
              }}
              style={{ display: "flex", padding: 2, borderRadius: 4, cursor: "pointer" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <X style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
            </span>
          )}
          <ChevronDown
            style={{
              width: 14,
              height: 14,
              color: "var(--text-muted)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease",
            }}
          />
        </span>
      </button>

      {/* dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {/* search input */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "6px 10px",
              }}
            >
              <Search style={{ width: 14, height: 14, color: "var(--text-dim)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontSize: "0.82rem",
                  color: "var(--text)",
                  padding: 0,
                }}
              />
            </div>
          </div>

          {/* options list */}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {/* All option */}
            <button
              onClick={() => {
                onChange("");
                setSearch("");
                setOpen(false);
              }}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                fontSize: "0.82rem",
                color: !value ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: !value ? 600 : 400,
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "none";
              }}
            >
              {t("all")}
            </button>

            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: "0.82rem", color: "var(--text-dim)" }}>
                {t("noMatches")}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setSearch("");
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    color: value === opt.value ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: value === opt.value ? 600 : 400,
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "none";
                  }}
                >
                  <span>{opt.value}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
                    {opt.count}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ExportClient ─── */

export default function ExportClient() {
  const t = useTranslations("Export");
  const tc = useTranslations("Common");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState<Format>("json");
  const [includeContent, setIncludeContent] = useState(true);
  const [includeComments, setIncludeComments] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load filter options once
  useEffect(() => {
    fetch("/api/plugins/export/options")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOptions(data))
      .catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (status) p.set("status", status);
    if (source) p.set("source", source);
    if (tag) p.set("tag", tag);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [type, status, source, tag, from, to]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plugins/export/stats?${buildParams()}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => {
    const timer = setTimeout(fetchStats, 300);
    return () => clearTimeout(timer);
  }, [fetchStats]);

  async function handleExport() {
    setExporting(true);
    const p = buildParams();
    p.set("format", format);
    if (!includeContent) p.set("includeContent", "false");
    if (includeComments) p.set("includeComments", "true");
    if (!includeImages) p.set("includeImages", "false");
    if (!includeMetadata) p.set("includeMetadata", "false");

    try {
      const res = await fetch(`/api/plugins/export/export?${p}`);
      if (!res.ok) {
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `clawkb-export.${format === "markdown" ? "md" : format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    setExporting(false);
  }

  const formats: { value: Format; label: string; icon: typeof FileText }[] = [
    { value: "json", label: "JSON", icon: FileCode },
    { value: "csv", label: "CSV", icon: FileSpreadsheet },
    { value: "markdown", label: "Markdown", icon: FileText },
  ];

  const dateInputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "10px 12px",
    fontSize: "0.875rem",
    color: "var(--text)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--text-dim)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {t("tools")}
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>
          {t("export")}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 2 }}>{t("exportDescription")}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Filters */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            {t("filters")}
          </h2>
          <div className="export-filter-grid">
            <div>
              <label style={labelStyle}>{t("type")}</label>
              <Combobox value={type} onChange={setType} options={options?.types || []} placeholder={t("allTypes")} />
            </div>
            <div>
              <label style={labelStyle}>{t("status")}</label>
              <Combobox
                value={status}
                onChange={setStatus}
                options={options?.statuses || []}
                placeholder={t("allStatuses")}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("source")}</label>
              <Combobox
                value={source}
                onChange={setSource}
                options={options?.sources || []}
                placeholder={t("allSources")}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("tag")}</label>
              <Combobox value={tag} onChange={setTag} options={options?.tags || []} placeholder={t("allTags")} />
            </div>
            <div>
              <label style={labelStyle}>{t("from")}</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={dateInputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t("to")}</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
        </div>

        {/* Options */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            {t("options")}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {[
              { label: t("content"), checked: includeContent, set: setIncludeContent },
              { label: t("comments"), checked: includeComments, set: setIncludeComments },
              { label: t("images"), checked: includeImages, set: setIncludeImages },
              { label: t("metadata"), checked: includeMetadata, set: setIncludeMetadata },
            ].map((opt) => (
              <label
                key={opt.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                }}
              >
                <input
                  type="checkbox"
                  checked={opt.checked}
                  onChange={(e) => opt.set(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Format */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>{t("format")}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {formats.map((f) => {
              const Icon = f.icon;
              const active = format === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: active ? "var(--accent-muted)" : "var(--background)",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            {t("preview")}
          </h2>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              {tc("loading")}
            </div>
          ) : stats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text)" }}>
                {stats.count}{" "}
                <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--text-muted)" }}>
                  {t("entries")}
                </span>
              </div>
              {Object.keys(stats.types).length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {t("byType")}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(stats.types).map(([k, v]) => (
                      <span
                        key={k}
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          background: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "4px 10px",
                        }}
                      >
                        {k} <span style={{ color: "var(--text-muted)" }}>{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(stats.statuses).length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {t("byStatus")}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(stats.statuses).map(([k, v]) => (
                      <span
                        key={k}
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          background: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "4px 10px",
                        }}
                      >
                        {k} <span style={{ color: "var(--text-muted)" }}>{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(stats.sources).length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {t("bySource")}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(stats.sources).map(([k, v]) => (
                      <span
                        key={k}
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          background: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "4px 10px",
                        }}
                      >
                        {k} <span style={{ color: "var(--text-muted)" }}>{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{t("noDataAvailable")}</p>
          )}
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={exporting || !stats?.count}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: "none",
            borderRadius: "var(--radius-md)",
            background: stats?.count ? "var(--accent)" : "var(--border)",
            color: stats?.count ? "var(--accent-contrast, #000)" : "var(--text-dim)",
            padding: "14px 24px",
            cursor: stats?.count ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: "0.9rem",
            transition: "all 0.15s ease",
          }}
        >
          {exporting ? (
            <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
          ) : (
            <Download style={{ width: 18, height: 18 }} />
          )}
          {exporting ? t("exporting") : t("exportButton", { count: stats?.count || 0, format: format.toUpperCase() })}
        </button>
      </div>

      <style>{`
        .export-filter-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .export-filter-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        input[type="date"] { color-scheme: dark; }
        input:focus { border-color: var(--accent) !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
