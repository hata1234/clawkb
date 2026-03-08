"use client";

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  opportunity: { bg: "rgba(201,169,110,0.12)", text: "var(--type-opportunity)", label: "Opportunity" },
  report: { bg: "rgba(96,165,250,0.12)", text: "var(--type-report)", label: "Report" },
  reference: { bg: "rgba(167,139,250,0.12)", text: "var(--type-reference)", label: "Reference" },
  project_note: { bg: "rgba(74,222,128,0.12)", text: "var(--type-project)", label: "Project Note" },
};

export default function TypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLES[type] || { bg: "rgba(113,113,122,0.12)", text: "var(--text-muted)", label: type };

  return (
    <span
      style={{
        display: "inline-block",
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
      {style.label}
    </span>
  );
}
