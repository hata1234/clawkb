import type { CSSProperties } from "react";

export const settingsCard: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "24px",
  marginBottom: 24,
};

export const settingsInputStyle: CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
};

export const settingsLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  fontWeight: 500,
  marginBottom: 6,
};

export const settingsBtnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  background: "var(--accent)",
  color: "var(--accent-contrast)",
  fontSize: "0.8rem",
  fontWeight: 600,
  borderRadius: "var(--radius-md)",
  border: "none",
  cursor: "pointer",
};

export const settingsBtnGhost: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "none",
  color: "var(--text-secondary)",
  fontSize: "0.8rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};

export const settingsBtnDanger: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
  background: "rgba(248,113,113,0.1)",
  color: "var(--danger)",
  fontSize: "0.75rem",
  border: "1px solid rgba(248,113,113,0.2)",
  borderRadius: "6px",
  cursor: "pointer",
};

export const settingsSectionTitle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};
