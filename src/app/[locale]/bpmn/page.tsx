"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Save, Loader2 } from "lucide-react";

const BpmnEditor = dynamic(() => import("@/components/BpmnEditor"), { ssr: false });

export default function BpmnPage() {
  const t = useTranslations("Bpmn");
  const router = useRouter();
  const [currentXml, setCurrentXml] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const saveToEntry = async () => {
    if (!currentXml) return;
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "process",
          source: "manual",
          title: t("newDiagram"),
          status: "new",
          bpmnXml: currentXml,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/entries/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 400, color: "var(--text)" }}>
          {t("editor")}
        </h1>
        <button
          onClick={saveToEntry}
          disabled={saving || !currentXml}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: saving ? "wait" : "pointer",
            border: "none",
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            opacity: saving || !currentXml ? 0.6 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {saving ? (
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : (
            <Save style={{ width: 14, height: 14 }} />
          )}
          {t("saveToEntry")}
        </button>
      </div>
      <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <BpmnEditor onChange={(xml) => setCurrentXml(xml)} height="100%" />
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
