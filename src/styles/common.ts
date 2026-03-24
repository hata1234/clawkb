import type { CSSProperties } from "react";

// ── Icon sizes ──────────────────────────────────────────────────────
export const icon12: CSSProperties = { width: 12, height: 12 };
export const icon14: CSSProperties = { width: 14, height: 14 };
export const icon16: CSSProperties = { width: 16, height: 16 };
export const icon18: CSSProperties = { width: 18, height: 18 };
export const icon24: CSSProperties = { width: 24, height: 24 };

export const icon14Dim: CSSProperties = {
  width: 14,
  height: 14,
  color: "var(--text-dim)",
  flexShrink: 0,
};

export const icon14Muted: CSSProperties = {
  width: 14,
  height: 14,
  color: "var(--text-muted)",
  flexShrink: 0,
};

// ── Layout helpers ──────────────────────────────────────────────────
export const flexCenter: CSSProperties = {
  display: "flex",
  alignItems: "center",
};

export const flexCenterGap6: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export const flexCenterGap8: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const flexWrapGap6: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

export const flexGap6: CSSProperties = { display: "flex", gap: 6 };
export const flexGap8: CSSProperties = { display: "flex", gap: 8 };

export const posRelative: CSSProperties = { position: "relative" };

// ── Text styles ─────────────────────────────────────────────────────
export const textDim: CSSProperties = { color: "var(--text-dim)" };
export const textMuted: CSSProperties = { color: "var(--text-muted)" };
export const textSecondary: CSSProperties = { color: "var(--text-secondary)" };

export const caption: CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-dim)",
};

export const captionSecondary: CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  marginTop: 4,
};

export const sectionHeading: CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 16,
};

// ── Table styles ────────────────────────────────────────────────────
export const thCell: CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  color: "var(--text-secondary)",
  fontWeight: 500,
};

export const tdCell: CSSProperties = {
  padding: "10px 16px",
  color: "var(--text-secondary)",
};

// ── Misc ────────────────────────────────────────────────────────────
export const coverImage: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

export const accentCheckbox: CSSProperties = {
  accentColor: "var(--accent)",
} as CSSProperties;

export const spinner: CSSProperties = {
  animation: "spin 1s linear infinite",
};
