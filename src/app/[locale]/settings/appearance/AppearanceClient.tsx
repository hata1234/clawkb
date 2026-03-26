"use client";

import { useTheme, type ThemePreset, type Density } from "@/components/ThemeProvider";
import { useTranslations } from "next-intl";
import { Sun, Moon, Paintbrush, Rows3, Rows4 } from "lucide-react";

const presets: { id: ThemePreset; labelKey: string; desc: string; colors: string[] }[] = [
  { id: "craft", labelKey: "presetCraft", desc: "Editorial dark with gold accents", colors: ["#0C0C0E", "#C9A96E", "#FAFAF9"] },
  { id: "corporate", labelKey: "presetCorporate", desc: "Clean blue, professional look", colors: ["#F9FAFB", "#2563EB", "#1A1A1A"] },
  { id: "minimal", labelKey: "presetMinimal", desc: "Monochrome, distraction-free", colors: ["#FFFFFF", "#18181B", "#18181B"] },
];

const densities: { id: Density; labelKey: string; icon: typeof Rows3 }[] = [
  { id: "comfortable", labelKey: "densityComfortable", icon: Rows3 },
  { id: "compact", labelKey: "densityCompact", icon: Rows4 },
];

export default function AppearanceClient() {
  const { theme, preset, density, toggleTheme, setPreset, setDensity } = useTheme();
  const t = useTranslations("Appearance");

  const sectionStyle: React.CSSProperties = {
    marginBottom: 32,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  const cardStyle = (active: boolean): React.CSSProperties => ({
    padding: "var(--density-padding-card)",
    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "var(--radius-md)",
    background: active ? "var(--accent-muted)" : "var(--surface)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  });

  return (
    <div>
      {/* Color Mode */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          {theme === "dark" ? <Moon style={{ width: 16, height: 16 }} /> : <Sun style={{ width: 16, height: 16 }} />}
          {t("colorMode")}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {(["dark", "light"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { if (theme !== mode) toggleTheme(); }}
              style={{
                ...cardStyle(theme === mode),
                flex: 1,
                alignItems: "center",
                minHeight: 80,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: mode === "dark" ? "#0C0C0E" : "#F8F8F6",
                border: "2px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {mode === "dark" ? <Moon style={{ width: 16, height: 16, color: "#C9A96E" }} /> : <Sun style={{ width: 16, height: 16, color: "#EAB308" }} />}
              </div>
              <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)" }}>
                {t(mode === "dark" ? "dark" : "light")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Preset */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Paintbrush style={{ width: 16, height: 16 }} />
          {t("themePreset")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              style={cardStyle(preset === p.id)}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {p.colors.map((c, i) => (
                  <div key={i} style={{
                    width: 20, height: 20, borderRadius: 4,
                    background: c,
                    border: "1px solid var(--border)",
                  }} />
                ))}
              </div>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                {t(p.labelKey)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {p.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Rows3 style={{ width: 16, height: 16 }} />
          {t("density")}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {densities.map((d) => {
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                onClick={() => setDensity(d.id)}
                style={{
                  ...cardStyle(density === d.id),
                  flex: 1,
                  alignItems: "center",
                  minHeight: 64,
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Icon style={{ width: 18, height: 18, color: density === d.id ? "var(--accent)" : "var(--text-muted)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)" }}>
                  {t(d.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview hint */}
      <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontStyle: "italic" }}>
        {t("previewHint")}
      </p>
    </div>
  );
}
