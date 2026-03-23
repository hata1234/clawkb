"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ZoomIn, ZoomOut, Maximize, Download, Save, FileCode } from "lucide-react";

// Must match bpmn-js 18's internal namespace URIs exactly (no "2.0/" segment)
const EMPTY_BPMN =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
  'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
  'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
  'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
  'targetNamespace="http://bpmn.io/schema/bpmn" ' +
  'id="Definitions_1">' +
  '<bpmn:process id="Process_1" isExecutable="false">' +
  '<bpmn:startEvent id="StartEvent_1"/>' +
  "</bpmn:process>" +
  '<bpmndi:BPMNDiagram id="BPMNDiagram_1">' +
  '<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">' +
  '<bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">' +
  '<dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0"/>' +
  "</bpmndi:BPMNShape>" +
  "</bpmndi:BPMNPlane>" +
  "</bpmndi:BPMNDiagram>" +
  "</bpmn:definitions>";

interface BpmnEditorProps {
  xml?: string;
  readOnly?: boolean;
  onChange?: (xml: string) => void;
  onSave?: (xml: string) => void;
  height?: string;
}

export default function BpmnEditor({ xml, readOnly = false, onChange, onSave, height = "100%" }: BpmnEditorProps) {
  const t = useTranslations("Bpmn");
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const initialXmlRef = useRef(xml); // capture initial xml, don't react to prop changes
  const onChangeRef = useRef(onChange); // stable ref for callback
  onChangeRef.current = onChange;
  const [loaded, setLoaded] = useState(false);

  const getCurrentXml = useCallback(async (): Promise<string | null> => {
    if (!instanceRef.current) return null;
    try {
      const result = await instanceRef.current.saveXML({ format: true });
      return result.xml;
    } catch {
      return null;
    }
  }, []);

  const handleSave = useCallback(async () => {
    const currentXml = await getCurrentXml();
    if (currentXml && onSave) onSave(currentXml);
  }, [getCurrentXml, onSave]);

  const handleDownloadSvg = useCallback(async () => {
    if (!instanceRef.current) return;
    try {
      const result = await instanceRef.current.saveSVG();
      const blob = new Blob([result.svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagram.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export SVG", e);
    }
  }, []);

  const handleDownloadXml = useCallback(async () => {
    const currentXml = await getCurrentXml();
    if (!currentXml) return;
    const blob = new Blob([currentXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.bpmn";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getCurrentXml]);

  const handleZoomIn = useCallback(() => {
    if (!instanceRef.current) return;
    instanceRef.current.get("zoomScroll")?.stepZoom(1);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!instanceRef.current) return;
    instanceRef.current.get("zoomScroll")?.stepZoom(-1);
  }, []);

  const handleFitView = useCallback(() => {
    if (!instanceRef.current) return;
    const canvas = instanceRef.current.get("canvas");
    canvas?.zoom("fit-viewport");
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    let bpmnInstance: any = null;

    // Use initial xml only (don't react to parent state changes from onChange)
    const initXml = initialXmlRef.current;
    const hasValidXml = initXml && initXml.trim().startsWith("<?xml");

    (async () => {
      if (readOnly) {
        const { default: Viewer } = await import("bpmn-js/lib/NavigatedViewer");
        if (destroyed) return;
        bpmnInstance = new Viewer({ container: containerRef.current! });
      } else {
        const { default: Modeler } = await import("bpmn-js/lib/Modeler");
        if (destroyed) return;
        bpmnInstance = new Modeler({ container: containerRef.current! });
      }

      instanceRef.current = bpmnInstance;

      try {
        if (hasValidXml) {
          await bpmnInstance.importXML(initXml);
        } else if (!readOnly && bpmnInstance.createDiagram) {
          await bpmnInstance.createDiagram();
        } else {
          await bpmnInstance.importXML(EMPTY_BPMN);
        }
        const canvas = bpmnInstance.get("canvas");
        canvas.zoom("fit-viewport");
        setLoaded(true);
      } catch (err) {
        console.error("Failed to import BPMN XML", err);
        if (!readOnly && bpmnInstance.createDiagram) {
          try {
            await bpmnInstance.createDiagram();
            const canvas = bpmnInstance.get("canvas");
            canvas.zoom("fit-viewport");
            setLoaded(true);
          } catch (e2) {
            console.error("createDiagram also failed", e2);
          }
        }
      }

      if (!readOnly) {
        bpmnInstance.on("commandStack.changed", async () => {
          try {
            const result = await bpmnInstance.saveXML({ format: true });
            onChangeRef.current?.(result.xml);
          } catch {
            // ignore
          }
        });
      }
    })();

    return () => {
      destroyed = true;
      if (bpmnInstance) {
        bpmnInstance.destroy();
      }
      instanceRef.current = null;
      setLoaded(false);
    };
  }, [readOnly]); // only re-init when mode changes, NOT when xml changes

  const btnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 10px",
    borderRadius: "var(--radius-md)",
    fontSize: "0.78rem",
    fontWeight: 500,
    cursor: "pointer",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-secondary)",
    transition: "all 0.15s ease",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      >
        {!readOnly && onSave && (
          <button
            onClick={handleSave}
            style={{ ...btnStyle, background: "var(--accent)", color: "var(--accent-contrast)", border: "none" }}
          >
            <Save style={{ width: 14, height: 14 }} /> {t("saveFlow")}
          </button>
        )}
        <button onClick={handleZoomIn} style={btnStyle} title={t("zoomIn")}>
          <ZoomIn style={{ width: 14, height: 14 }} />
        </button>
        <button onClick={handleZoomOut} style={btnStyle} title={t("zoomOut")}>
          <ZoomOut style={{ width: 14, height: 14 }} />
        </button>
        <button onClick={handleFitView} style={btnStyle} title={t("fitView")}>
          <Maximize style={{ width: 14, height: 14 }} />
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handleDownloadSvg} style={btnStyle}>
          <Download style={{ width: 14, height: 14 }} /> {t("downloadSvg")}
        </button>
        <button onClick={handleDownloadXml} style={btnStyle}>
          <FileCode style={{ width: 14, height: 14 }} /> {t("downloadXml")}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: height,
          background: "var(--background)",
          borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
          position: "relative",
          overflow: "hidden",
        }}
      />

      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
}
