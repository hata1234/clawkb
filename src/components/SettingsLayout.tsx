"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Shield, Puzzle, Lock, FolderOpen, Webhook, Bot } from "lucide-react";

const tabs = [
  { href: "/settings", label: "General", icon: Settings, exact: true },
  { href: "/settings/collections", label: "Collections", icon: FolderOpen },
  { href: "/settings/users", label: "Users", icon: Users },
  { href: "/settings/permissions", label: "Permissions", icon: Lock },
  { href: "/settings/auth", label: "Auth", icon: Shield },
  { href: "/settings/plugins", label: "Plugins", icon: Puzzle },
  { href: "/settings/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/settings/rag", label: "RAG / AI", icon: Bot },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(tab: typeof tabs[0]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>System</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>Settings</h1>
      </div>

      <nav className="settings-tabs" style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--border)",
        marginBottom: 24,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                fontSize: "0.85rem",
                fontWeight: 500,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                textDecoration: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
      <style>{".settings-tabs::-webkit-scrollbar { display: none; }"}</style>
    </div>
  );
}
