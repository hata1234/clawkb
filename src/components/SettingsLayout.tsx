"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, Shield, Puzzle } from "lucide-react";

const tabs = [
  { href: "/settings", label: "General", icon: Settings, exact: true },
  { href: "/settings/users", label: "Users", icon: Users },
  { href: "/settings/auth", label: "Auth", icon: Shield },
  { href: "/settings/plugins", label: "Plugins", icon: Puzzle },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function isActive(tab: typeof tabs[0]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <h1 style={{
        fontFamily: "var(--font-heading)",
        fontSize: "1.8rem",
        fontWeight: 400,
        marginBottom: 20,
      }}>
        Settings
      </h1>

      <nav style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--border)",
        marginBottom: 24,
        overflowX: "auto",
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
    </div>
  );
}
