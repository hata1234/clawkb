"use client";

import dynamic from "next/dynamic";
import type { ContentTagComponentProps } from "@/lib/content-tag-registry";

const BpmnEditor = dynamic(() => import("@/components/BpmnEditor"), { ssr: false });

export default function BpmnFlowTag({ props }: ContentTagComponentProps) {
  const { name, bpmnXml } = props as { name?: string; bpmnXml?: string; flowId?: number };

  if (!bpmnXml) return null;

  return (
    <div style={{
      margin: "20px 0",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      border: "1px solid var(--border)",
    }}>
      {name && (
        <div style={{
          padding: "8px 14px",
          background: "var(--surface-hover)",
          borderBottom: "1px solid var(--border)",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          {name}
        </div>
      )}
      <div style={{ height: 360 }}>
        <BpmnEditor xml={bpmnXml} readOnly />
      </div>
    </div>
  );
}
