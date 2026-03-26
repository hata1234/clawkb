"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";

interface TaxonomyItem {
  level: string;
  label: string;
  count: number;
}

const LEVEL_ICONS: Record<string, string> = {
  L1: "📕",
  L2: "📘",
  L3: "📗",
  L4: "📄",
  HACCP: "🛡️",
};

export default function PluginDocumentTree({ collapsed }: { collapsed?: boolean }) {
  const [taxonomy, setTaxonomy] = useState<TaxonomyItem[]>([]);
  const [open, setOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/plugins/private-plugin/taxonomy")
      .then((r) => (r.ok ? r.json() : { taxonomy: [] }))
      .then((data) => {
        setTaxonomy(data.taxonomy || []);
        setLoaded(true);
      })
      .catch(() => {
        setTaxonomy([]);
        setLoaded(true);
      });
  }, []);

  // Don't render if no taxonomy data or plugin not active
  if (loaded && taxonomy.length === 0) return null;
  if (!loaded) return null;

  if (collapsed) {
    return (
      <div
        title="文件分類"
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "10px 0",
        }}
      >
        <span style={{ fontSize: "1rem" }}>📋</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 8,
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--text-secondary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.9rem" }}>📋</span>
        <span style={{ flex: 1 }}>文件分類</span>
        <span
          style={{
            width: 14,
            height: 14,
            color: "var(--text-dim)",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s ease",
            fontSize: "0.65rem",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div style={{ paddingLeft: 12, display: "flex", flexDirection: "column", gap: 1 }}>
          {taxonomy.map((item) => (
            <Link
              key={item.level}
              href={`/entries?documentLevel=${item.level}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "0.85rem", width: 16, textAlign: "center" }}>
                {LEVEL_ICONS[item.level] || "📄"}
              </span>
              <span style={{ flex: 1 }}>
                {item.label}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  background: "var(--surface-hover)",
                  color: "var(--text-dim)",
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                {item.count}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
