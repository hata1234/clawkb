"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Settings, Users, Shield, Puzzle, Lock, FolderOpen, Webhook, Bot, Mail } from "lucide-react";

const tabs = [
  { href: "/settings" as const, labelKey: "general", icon: Settings, exact: true },
  { href: "/settings/collections" as const, labelKey: "collections", icon: FolderOpen },
  { href: "/settings/users" as const, labelKey: "users", icon: Users },
  { href: "/settings/permissions" as const, labelKey: "permissions", icon: Lock },
  { href: "/settings/auth" as const, labelKey: "auth", icon: Shield },
  { href: "/settings/plugins" as const, labelKey: "plugins", icon: Puzzle },
  { href: "/settings/webhooks" as const, labelKey: "webhooks", icon: Webhook },
  { href: "/settings/rag" as const, labelKey: "rag", icon: Bot },
  { href: "/settings/smtp" as const, labelKey: "smtp", icon: Mail },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("Settings");

  function isActive(tab: typeof tabs[0]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{t("label")}</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>{t("title")}</h1>
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
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </nav>

      {children}
      <style>{".settings-tabs::-webkit-scrollbar { display: none; }"}</style>
    </div>
  );
}
