"use client";

import { useTranslations } from "next-intl";
import { useStatuses } from "@/hooks/useStatuses";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("StatusBadge");
  const { getColor } = useStatuses();
  const color = getColor(status);

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
        backgroundColor: hexToRgba(color, 0.1),
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {t.has(status) ? t(status) : status.replace(/_/g, " ")}
    </span>
  );
}
