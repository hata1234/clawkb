"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";

const BpmnEditor = dynamic(() => import("@/components/BpmnEditor"), { ssr: false });

interface EntryData {
  id: number;
  title: string;
  bpmnXml?: string | null;
}

interface FlowData {
  id: number;
  name: string;
  bpmnXml: string;
}

export default function BpmnEntryEditorPage() {
  const t = useTranslations("Bpmn");
  const params = useParams();
  const searchParams = useSearchParams();
  const entryId = params.entryId as string;
  const flowId = searchParams.get("flowId");

  const [entry, setEntry] = useState<EntryData | null>(null);
  const [flow, setFlow] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const currentXmlRef = useRef<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/entries/${entryId}`);
        if (!res.ok) {
          setError(res.status === 404 ? t("entryNotFound") : t("failedToLoadEntry"));
          setLoading(false);
          return;
        }
        const data = await res.json();
        setEntry(data);

        if (flowId) {
          // Load specific flow
          const flowRes = await fetch(`/api/entries/${entryId}/flows/${flowId}`);
          if (flowRes.ok) {
            const flowData = await flowRes.json();
            setFlow(flowData);
            currentXmlRef.current = flowData.bpmnXml || "";
          } else {
            setError("Flow not found");
          }
        } else {
          // Legacy mode: edit entry.bpmnXml directly
          if (data.bpmnXml) currentXmlRef.current = data.bpmnXml;
        }
      } catch {
        setError(t("failedToConnect"));
      } finally {
        setLoading(false);
      }
    })();
  }, [entryId, flowId]);

  const handleChange = useCallback((xml: string) => {
    currentXmlRef.current = xml;
    setSaveState("unsaved");
  }, []);

  const handleSave = useCallback(
    async (xml: string) => {
      setSaveState("saving");
      try {
        let res: Response;
        if (flowId && flow) {
          // Save to flow
          res = await fetch(`/api/entries/${entryId}/flows/${flowId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bpmnXml: xml }),
          });
          if (res.ok) {
            const updated = await res.json();
            setFlow(updated);
          }
        } else {
          // Legacy: save to entry.bpmnXml
          res = await fetch(`/api/entries/${entryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bpmnXml: xml }),
          });
          if (res.ok) {
            const updated = await res.json();
            setEntry((prev) => (prev ? { ...prev, bpmnXml: updated.bpmnXml } : prev));
          }
        }
        setSaveState(res.ok ? "saved" : "unsaved");
      } catch {
        setSaveState("unsaved");
      }
    },
    [entryId, flowId, flow],
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 80px)" }}>
        <Loader2 style={{ width: 24, height: 24, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 80px)",
          gap: 16,
        }}
      >
        <AlertCircle style={{ width: 32, height: 32, color: "var(--danger)" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{error || t("entryNotFound")}</p>
        <Link href="/entries" style={{ fontSize: "0.85rem", color: "var(--accent)", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle" }} /> Back to entries
        </Link>
      </div>
    );
  }

  const initialXml = flow ? flow.bpmnXml : entry.bpmnXml || undefined;
  const subtitle = flow ? `${flow.name || "Flow " + flow.id}` : t("title");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Link
            href={`/entries/${entry.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} /> {t("backToEntry")}
          </Link>
          <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>|</span>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.title} — {subtitle}
          </span>
        </div>

        {/* Save state indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", flexShrink: 0 }}>
          {saveState === "saving" && (
            <>
              <Loader2
                style={{ width: 13, height: 13, color: "var(--text-muted)", animation: "spin 1s linear infinite" }}
              />
              <span style={{ color: "var(--text-muted)" }}>{t("saveFlow")}...</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check style={{ width: 13, height: 13, color: "var(--success, #4ade80)" }} />
              <span style={{ color: "var(--success, #4ade80)" }}>{t("saved")}</span>
            </>
          )}
          {saveState === "unsaved" && (
            <>
              <AlertCircle style={{ width: 13, height: 13, color: "var(--warning, #fbbf24)" }} />
              <span style={{ color: "var(--warning, #fbbf24)" }}>{t("unsaved")}</span>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <BpmnEditor xml={initialXml} onChange={handleChange} onSave={handleSave} height="100%" />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
