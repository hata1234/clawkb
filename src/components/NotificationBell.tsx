"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function NotificationBell({ collapsed }: { collapsed?: boolean }) {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // SSE connection for real-time count
  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "count") {
          setCount(data.count);
        }
      } catch { /* ignore parse errors */ }
    };

    eventSource.onerror = () => {
      // Will auto-reconnect
    };

    return () => eventSource.close();
  }, []);

  // Fetch notifications when panel opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleClick(n: Notification) {
    // Mark as read
    if (!n.read) {
      fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setCount(c => Math.max(0, c - 1));
    }
    // Navigate
    if (n.link) {
      router.push(n.link);
      setOpen(false);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setCount(0);
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="sidebar-theme-btn"
        title={t("title")}
        style={{ position: "relative" }}
      >
        <Bell style={{ width: 18, height: 18, flexShrink: 0 }} />
        {!collapsed && <span className="sidebar-link-label">{t("title")}</span>}
        {count > 0 && (
          <span style={{
            position: "absolute",
            top: 6,
            left: collapsed ? 24 : 22,
            minWidth: 16,
            height: 16,
            borderRadius: 999,
            background: "var(--danger)",
            color: "#fff",
            fontSize: "0.6rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            lineHeight: 1,
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          bottom: collapsed ? 0 : "100%",
          left: collapsed ? 68 : 4,
          right: collapsed ? "auto" : 4,
          width: collapsed ? 320 : undefined,
          minWidth: 280,
          maxHeight: 400,
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "var(--shadow-lg)",
          zIndex: 100,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          marginBottom: collapsed ? 0 : 4,
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text)" }}>
              {t("title")}
            </span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                {t("loading")}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                {t("empty")}
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    width: "100%",
                    padding: "10px 16px",
                    background: n.read ? "transparent" : "rgba(201,169,110,0.04)",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: n.link ? "pointer" : "default",
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? "transparent" : "rgba(201,169,110,0.04)")}
                >
                  {/* Unread dot */}
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: n.read ? "transparent" : "var(--accent)",
                    flexShrink: 0,
                    marginTop: 6,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.82rem",
                      fontWeight: n.read ? 400 : 600,
                      color: "var(--text)",
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {n.body}
                      </div>
                    )}
                    <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: 3 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
