"use client";

import { useTranslations } from "next-intl";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  new: { bg: "rgba(251,191,36,0.1)", text: "var(--status-new)", dot: "var(--status-new)" },
  interested: { bg: "rgba(96,165,250,0.1)", text: "var(--status-interested)", dot: "var(--status-interested)" },
  in_progress: { bg: "rgba(192,132,252,0.1)", text: "var(--status-in-progress)", dot: "var(--status-in-progress)" },
  done: { bg: "rgba(74,222,128,0.1)", text: "var(--status-done)", dot: "var(--status-done)" },
  archived: { bg: "rgba(113,113,122,0.1)", text: "var(--status-archived)", dot: "var(--status-archived)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('StatusBadge');
  const style = STATUS_STYLES[status] || STATUS_STYLES.archived;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "0.75rem",
        fontWeight: 500,
        lineHeight: 1,
        padding: "4px 10px",
        borderRadius: 999,
        textTransform: "capitalize",
        backgroundColor: style.bg,
        color: style.text,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: style.dot,
          flexShrink: 0,
        }}
      />
      {t.has(status) ? t(status) : status.replace("_", " ")}
    </span>
  );
}
