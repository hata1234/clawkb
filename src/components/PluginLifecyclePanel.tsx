"use client";

import { useState, useEffect, useCallback } from "react";
import { useStatuses, type StatusDef } from "@/hooks/useStatuses";

// ─── Types ─────────────────────────────────────────────────────
interface LifecycleData {
  entry_id: number;
  document_level: string;
  is_controlled: boolean;
  effective_date: string | null;
  review_cycle_days: number;
  review_due_date: string | null;
  last_review_date: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

interface AuditEvent {
  id: number;
  action: string;
  changes: { fromStatus?: string; toStatus?: string } | null;
  actor_id: number | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface PluginLifecyclePanelProps {
  entryId: number;
  entryStatus: string;
  lifecycle: LifecycleData;
  onUpdate: () => void;
}

// ─── Constants ─────────────────────────────────────────────────
const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "L1", label: "L1 — 品質手冊" },
  { value: "L2", label: "L2 — 程序書" },
  { value: "L3", label: "L3 — 作業指導書" },
  { value: "L4", label: "L4 — 表單紀錄" },
  { value: "HACCP", label: "HACCP" },
];

function formatDateStr(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function toInputDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

// ─── Component ─────────────────────────────────────────────────
export default function PluginLifecyclePanel({
  entryId,
  entryStatus,
  lifecycle,
  onUpdate,
}: PluginLifecyclePanelProps) {
  const { statuses, getColor } = useStatuses();
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Editable fields (local state)
  const [docLevel, setDocLevel] = useState(lifecycle.document_level);
  const [isControlled, setIsControlled] = useState(lifecycle.is_controlled);
  const [effectiveDate, setEffectiveDate] = useState(toInputDate(lifecycle.effective_date));
  const [reviewCycleDays, setReviewCycleDays] = useState(lifecycle.review_cycle_days);

  // Sync from props
  useEffect(() => {
    setDocLevel(lifecycle.document_level);
    setIsControlled(lifecycle.is_controlled);
    setEffectiveDate(toInputDate(lifecycle.effective_date));
    setReviewCycleDays(lifecycle.review_cycle_days);
  }, [lifecycle]);

  // Fetch audit trail
  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/audit?entityType=plugin_lifecycle&entityId=${entryId}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        setAuditEvents(data.events || []);
      }
    } catch {
      // silent
    }
  }, [entryId]);

  useEffect(() => {
    if (timelineOpen) fetchAudit();
  }, [timelineOpen, fetchAudit]);

  // Current status definition
  const currentStatusDef = statuses.find((s: StatusDef) => s.key === entryStatus);
  const statusColor = getColor(entryStatus);
  const allowedTransitions = currentStatusDef?.allowedTransitions || [];

  // ─── Handlers ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/plugins/private-plugin/lifecycle/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentLevel: docLevel,
          isControlled,
          effectiveDate: effectiveDate || null,
          reviewCycleDays,
        }),
      });
      onUpdate();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (toStatus: string) => {
    setTransitioning(toStatus);
    try {
      const res = await fetch("/api/plugins/private-plugin/status-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, toStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Transition failed");
      } else {
        onUpdate();
      }
    } catch {
      alert("Network error");
    } finally {
      setTransitioning(null);
    }
  };

  const hasChanges =
    docLevel !== lifecycle.document_level ||
    isControlled !== lifecycle.is_controlled ||
    effectiveDate !== toInputDate(lifecycle.effective_date) ||
    reviewCycleDays !== lifecycle.review_cycle_days;

  // ─── Render ────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl, 16px)",
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "14px 20px",
          background: "none",
          border: "none",
          borderBottom: collapsed ? "none" : "1px solid var(--border)",
          cursor: "pointer",
          color: "var(--text)",
          fontSize: "0.85rem",
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: "1rem" }}>📋</span>
        <span>文件生命週期</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.75rem",
            color: "var(--text-dim)",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          ▼
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: "16px 20px" }}>
          {/* Status + Transitions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {/* Big status badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.9rem",
                fontWeight: 600,
                padding: "6px 16px",
                borderRadius: 999,
                backgroundColor: statusColor + "1A",
                color: statusColor,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>
                {currentStatusDef?.icon || "⚪"}
              </span>
              {currentStatusDef?.label || entryStatus}
            </div>

            {/* Transition arrows */}
            {allowedTransitions.length > 0 && (
              <>
                <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>→</span>
                {allowedTransitions.map((toStatus: string) => {
                  const toDef = statuses.find((s: StatusDef) => s.key === toStatus);
                  const toColor = getColor(toStatus);
                  return (
                    <button
                      key={toStatus}
                      onClick={() => handleTransition(toStatus)}
                      disabled={transitioning !== null}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        padding: "5px 12px",
                        borderRadius: 999,
                        border: `1px solid ${toColor}40`,
                        background: transitioning === toStatus ? toColor + "30" : "transparent",
                        color: toColor,
                        cursor: transitioning !== null ? "wait" : "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {toDef?.icon || "⚪"} {toDef?.label || toStatus}
                      {transitioning === toStatus && " …"}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Lifecycle Fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {/* Document Level */}
            <div>
              <label style={labelStyle}>文件層級</label>
              <select
                value={docLevel}
                onChange={(e) => setDocLevel(e.target.value)}
                style={inputFieldStyle}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Is Controlled */}
            <div>
              <label style={labelStyle}>受控文件</label>
              <button
                onClick={() => setIsControlled(!isControlled)}
                style={{
                  ...inputFieldStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: isControlled ? "var(--accent-muted)" : "var(--background)",
                  color: isControlled ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: 500,
                  border: `1px solid ${isControlled ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `2px solid ${isControlled ? "var(--accent)" : "var(--border)"}`,
                    background: isControlled ? "var(--accent)" : "transparent",
                    color: "#fff",
                    fontSize: "0.65rem",
                    lineHeight: "12px",
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {isControlled ? "✓" : ""}
                </span>
                {isControlled ? "是" : "否"}
              </button>
            </div>

            {/* Effective Date */}
            <div>
              <label style={labelStyle}>生效日期</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={inputFieldStyle}
              />
            </div>

            {/* Review Cycle */}
            <div>
              <label style={labelStyle}>覆審週期（天）</label>
              <input
                type="number"
                min={1}
                value={reviewCycleDays}
                onChange={(e) => setReviewCycleDays(parseInt(e.target.value) || 365)}
                style={inputFieldStyle}
              />
            </div>

            {/* Review Due Date (read-only) */}
            <div>
              <label style={labelStyle}>覆審到期日</label>
              <div
                style={{
                  ...readOnlyFieldStyle,
                  color: isOverdue(lifecycle.review_due_date)
                    ? "#EF4444"
                    : "var(--text)",
                  fontWeight: isOverdue(lifecycle.review_due_date) ? 600 : 400,
                }}
              >
                {formatDateStr(lifecycle.review_due_date)}
                {isOverdue(lifecycle.review_due_date) && (
                  <span style={{ marginLeft: 6, fontSize: "0.7rem" }}>⚠️ 已逾期</span>
                )}
              </div>
            </div>

            {/* Last Review Date (read-only) */}
            <div>
              <label style={labelStyle}>最後覆審日</label>
              <div style={readOnlyFieldStyle}>
                {formatDateStr(lifecycle.last_review_date)}
              </div>
            </div>

            {/* Review Count (read-only) */}
            <div>
              <label style={labelStyle}>覆審次數</label>
              <div style={readOnlyFieldStyle}>{lifecycle.review_count}</div>
            </div>
          </div>

          {/* Save button */}
          {hasChanges && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  padding: "6px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {saving ? "儲存中…" : "儲存變更"}
              </button>
            </div>
          )}

          {/* Status Timeline */}
          <div>
            <button
              onClick={() => setTimelineOpen(!timelineOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: "0.78rem",
                fontWeight: 500,
                padding: "4px 0",
              }}
            >
              <span
                style={{
                  transform: timelineOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.15s",
                  display: "inline-block",
                }}
              >
                ▼
              </span>
              狀態變更紀錄
            </button>

            {timelineOpen && (
              <div
                style={{
                  marginTop: 8,
                  padding: "12px 16px",
                  background: "var(--background)",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--border)",
                  maxHeight: 240,
                  overflowY: "auto",
                }}
              >
                {auditEvents.length === 0 ? (
                  <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                    尚無狀態變更紀錄
                  </span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {auditEvents.map((evt) => {
                      const from = evt.changes?.fromStatus;
                      const to = evt.changes?.toStatus;
                      return (
                        <div
                          key={evt.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: "0.78rem",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: to ? getColor(to) : "var(--text-dim)",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: "var(--text-muted)", minWidth: 90 }}>
                            {new Date(evt.created_at).toLocaleString("zh-TW")}
                          </span>
                          <span style={{ color: "var(--text)" }}>
                            {from && (
                              <span style={{ color: getColor(from) }}>{from}</span>
                            )}
                            {from && to && " → "}
                            {to && (
                              <span style={{ color: getColor(to), fontWeight: 500 }}>{to}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Styles ─────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 500,
  color: "var(--text-muted)",
  marginBottom: 4,
  letterSpacing: "0.02em",
};

const inputFieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  fontSize: "0.82rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md, 8px)",
  background: "var(--background)",
  color: "var(--text)",
  outline: "none",
};

const readOnlyFieldStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: "0.82rem",
  color: "var(--text)",
  background: "var(--surface-hover, var(--background))",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid transparent",
};
