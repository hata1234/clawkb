"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Webhook, Plus, Trash2, Check, X, Loader2, Copy, ChevronDown, ChevronRight, Circle } from "lucide-react";

// ─── Style constants (matching SettingsClient) ───────────────────────────
const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "24px",
  marginBottom: 24,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  fontWeight: 500,
  marginBottom: 6,
};

const btnPrimary: React.CSSProperties = {
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

const btnGhost: React.CSSProperties = {
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

const btnDanger: React.CSSProperties = {
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

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

// ─── Types ───────────────────────────────────────────────────────────────
interface WebhookData {
  id: number;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryData {
  id: number;
  event: string;
  status: number;
  response: string | null;
  attempts: number;
  createdAt: string;
}

const ALL_EVENTS = [
  { id: "entry.created", label: "Entry Created" },
  { id: "entry.updated", label: "Entry Updated" },
  { id: "entry.deleted", label: "Entry Deleted" },
  { id: "entry.restored", label: "Entry Restored" },
  { id: "comment.created", label: "Comment Created" },
];

// ─── Toast ───────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 999,
        padding: "10px 16px",
        borderRadius: "var(--radius-md)",
        background: ok ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
        border: `1px solid ${ok ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
        color: ok ? "var(--success)" : "var(--danger)",
        fontSize: "0.875rem",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {ok ? <Check style={{ width: 14, height: 14 }} /> : <X style={{ width: 14, height: 14 }} />}
      {msg}
    </div>
  );
}

// ─── Deliveries Panel ────────────────────────────────────────────────────
function DeliveriesPanel({ webhookId }: { webhookId: number }) {
  const t = useTranslations("Webhooks");
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/webhooks/${webhookId}/deliveries`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setDeliveries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [webhookId]);

  if (loading) return <Loader2 style={{ width: 14, height: 14, color: "var(--text-dim)" }} className="spin" />;
  if (deliveries.length === 0)
    return <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{t("noDeliveriesYet")}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {deliveries.map((d) => (
        <div
          key={d.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px",
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
          }}
        >
          <Circle
            style={{
              width: 8,
              height: 8,
              fill: d.status >= 200 && d.status < 300 ? "var(--success)" : "var(--danger)",
              color: d.status >= 200 && d.status < 300 ? "var(--success)" : "var(--danger)",
              flexShrink: 0,
            }}
          />
          <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", minWidth: 36 }}>
            {d.status || "ERR"}
          </span>
          <span style={{ color: "var(--text-secondary)" }}>{d.event}</span>
          <span style={{ color: "var(--text-dim)", marginLeft: "auto", flexShrink: 0 }}>
            {d.attempts > 1 && `${d.attempts} attempts · `}
            {new Date(d.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function WebhooksClient() {
  const t = useTranslations("Webhooks");
  const tc = useTranslations("Common");
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["entry.created"]);
  const [creating, setCreating] = useState(false);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) setWebhooks(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  async function createWebhook() {
    if (!formUrl.trim()) return;
    if (formEvents.length === 0) {
      showToast(t("selectAtLeastOneEvent"), false);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), url: formUrl.trim(), events: formEvents }),
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedSecret(data.secret);
        setFormName("");
        setFormUrl("");
        setFormEvents(["entry.created"]);
        setShowForm(false);
        showToast(t("webhookCreated"), true);
        fetchWebhooks();
      } else {
        const err = await res.json();
        showToast(err.error || t("failedToCreateWebhook"), false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(webhook: WebhookData) {
    const res = await fetch(`/api/webhooks/${webhook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !webhook.active }),
    });
    if (res.ok) {
      showToast(webhook.active ? t("webhookDisabled") : t("webhookEnabled"), true);
      fetchWebhooks();
    }
  }

  async function deleteWebhook(id: number) {
    if (!confirm(t("confirmDeleteWebhook"))) return;
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast(t("webhookDeleted"), true);
      if (expandedId === id) setExpandedId(null);
      fetchWebhooks();
    } else {
      showToast(t("failedToDeleteWebhook"), false);
    }
  }

  function toggleEvent(eventId: string) {
    setFormEvents((prev) => (prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]));
  }

  return (
    <div>
      {/* Secret reveal banner */}
      {revealedSecret && (
        <div
          style={{
            ...card,
            background: "rgba(74,222,128,0.06)",
            border: "1px solid rgba(74,222,128,0.25)",
            marginBottom: 24,
          }}
        >
          <div style={{ ...sectionTitle, color: "var(--success)", marginBottom: 8 }}>
            <Webhook style={{ width: 16, height: 16 }} />
            {t("webhookSecretCopyNow")}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
            {t("webhookSecretDescription")}
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text)",
                wordBreak: "break-all",
              }}
            >
              {revealedSecret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(revealedSecret);
                showToast(tc("copiedToClipboard"), true);
              }}
              style={btnPrimary}
            >
              <Copy style={{ width: 14, height: 14 }} /> {tc("copy")}
            </button>
            <button onClick={() => setRevealedSecret(null)} style={btnGhost}>
              <X style={{ width: 14, height: 14 }} /> {tc("dismiss")}
            </button>
          </div>
        </div>
      )}

      {/* Header + Add button */}
      <div style={card}>
        <div style={{ ...sectionTitle, marginBottom: showForm ? 16 : 0 }}>
          <Webhook style={{ width: 16, height: 16, color: "var(--accent)" }} />
          {t("webhooks")}
          {loading && (
            <Loader2 style={{ width: 14, height: 14, marginLeft: 8, color: "var(--text-dim)" }} className="spin" />
          )}
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, marginLeft: "auto" }}>
              <Plus style={{ width: 14, height: 14 }} /> {t("addWebhook")}
            </button>
          )}
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: showForm ? 16 : 0 }}>
          {t("webhooksDescription")}
        </p>

        {/* Create form */}
        {showForm && (
          <div
            style={{
              padding: 16,
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              marginTop: 12,
            }}
          >
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{t("nameOptional")}</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                  placeholder={t("webhookNamePlaceholder")}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>{t("url")}</label>
                <input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  style={inputStyle}
                  placeholder="https://example.com/webhook"
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t("events")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALL_EVENTS.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => toggleEvent(ev.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${formEvents.includes(ev.id) ? "var(--accent)" : "var(--border)"}`,
                      background: formEvents.includes(ev.id) ? "var(--accent-muted)" : "var(--background)",
                      color: formEvents.includes(ev.id) ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={createWebhook}
                disabled={creating}
                style={{ ...btnPrimary, opacity: creating ? 0.6 : 1 }}
              >
                {creating ? (
                  <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                ) : (
                  <Check style={{ width: 14, height: 14 }} />
                )}
                {tc("create")}
              </button>
              <button onClick={() => setShowForm(false)} style={btnGhost}>
                <X style={{ width: 14, height: 14 }} /> {tc("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Webhook list */}
      {!loading && webhooks.length === 0 && !showForm && (
        <div style={{ ...card, textAlign: "center", color: "var(--text-dim)" }}>
          <p style={{ fontSize: "0.875rem" }}>{t("noWebhooksYet")}</p>
        </div>
      )}

      {webhooks.map((w) => (
        <div key={w.id} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Expand toggle */}
            <button
              onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-dim)",
                padding: 0,
                display: "flex",
              }}
            >
              {expandedId === w.id ? (
                <ChevronDown style={{ width: 16, height: 16 }} />
              ) : (
                <ChevronRight style={{ width: 16, height: 16 }} />
              )}
            </button>

            {/* Active indicator */}
            <Circle
              style={{
                width: 8,
                height: 8,
                flexShrink: 0,
                fill: w.active ? "var(--success)" : "var(--text-dim)",
                color: w.active ? "var(--success)" : "var(--text-dim)",
              }}
            />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>{w.name || w.url}</div>
              {w.name && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {w.url}
                </div>
              )}
            </div>

            {/* Event badges */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flexShrink: 0 }}>
              {w.events.map((ev) => (
                <span
                  key={ev}
                  style={{
                    padding: "2px 8px",
                    background: "var(--accent-muted)",
                    color: "var(--accent)",
                    fontSize: "0.65rem",
                    borderRadius: 12,
                    fontWeight: 500,
                  }}
                >
                  {ev}
                </span>
              ))}
            </div>

            {/* Toggle active */}
            <button
              onClick={() => toggleActive(w)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                background: "none",
                border: `1px solid ${w.active ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
                color: w.active ? "var(--success)" : "var(--text-dim)",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 14,
                  borderRadius: 7,
                  background: w.active ? "var(--success)" : "var(--border)",
                  position: "relative",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: w.active ? 16 : 2,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "var(--text)",
                    transition: "left 0.15s",
                  }}
                />
              </div>
            </button>

            {/* Delete */}
            <button onClick={() => deleteWebhook(w.id)} style={btnDanger}>
              <Trash2 style={{ width: 12, height: 12 }} />
            </button>
          </div>

          {/* Expanded: deliveries */}
          {expandedId === w.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                {t("recentDeliveries")}
              </div>
              <DeliveriesPanel webhookId={w.id} />
            </div>
          )}
        </div>
      ))}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 2px rgba(201,169,110,0.15); }
        input::placeholder { color: var(--text-dim); }
      `}</style>
    </div>
  );
}
