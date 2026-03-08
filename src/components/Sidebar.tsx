"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Tag,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entries", label: "Entries", icon: FileText },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/entries/new", label: "New Entry", icon: PlusCircle },
];

export default function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const nav = (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Sparkles className="sidebar-icon-sparkle" />
        </div>
        <span className="sidebar-logo-text">ClawKB</span>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`sidebar-link ${active ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
            >
              <Icon className="sidebar-link-icon" />
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar-collapse-btn"
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <ChevronRight className="sidebar-chevron" /> : <ChevronLeft className="sidebar-chevron" />}
      </button>

      {/* User section */}
      <div className="sidebar-user">
        <div className="sidebar-user-inner">
          <div className="sidebar-avatar">
            {userName?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="sidebar-username">{userName || "User"}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-logout"
            title="Sign out"
          >
            <LogOut className="sidebar-logout-icon" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        {nav}
      </aside>

      <style>{`
        /* ═══ Sidebar Base ═══ */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 40;
          height: 100vh;
          width: 240px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, width 0.2s ease;
          transform: translateX(-100%);
        }
        .sidebar.open {
          transform: translateX(0);
        }

        /* ═══ Desktop ═══ */
        @media (min-width: 768px) {
          .sidebar {
            transform: translateX(0);
          }
          .sidebar.collapsed {
            width: 68px;
          }
          .sidebar.collapsed .sidebar-logo-text,
          .sidebar.collapsed .sidebar-link-label,
          .sidebar.collapsed .sidebar-username,
          .sidebar.collapsed .sidebar-logout {
            display: none;
          }
          .sidebar.collapsed .sidebar-link {
            justify-content: center;
          }
        }

        /* ═══ Hamburger ═══ */
        .sidebar-hamburger {
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 50;
          padding: 8px;
          border-radius: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          display: block;
        }
        @media (min-width: 768px) {
          .sidebar-hamburger { display: none; }
        }

        /* ═══ Overlay ═══ */
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 39;
        }
        @media (min-width: 768px) {
          .sidebar-overlay { display: none !important; }
        }

        /* ═══ Logo ═══ */
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 16px;
          border-bottom: 1px solid var(--border);
          min-height: 65px;
        }
        .sidebar-logo-icon {
          padding: 6px;
          background: var(--accent-muted);
          border-radius: 8px;
          flex-shrink: 0;
        }
        .sidebar-icon-sparkle {
          width: 20px;
          height: 20px;
          color: var(--accent);
        }
        .sidebar-logo-text {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          color: var(--accent);
          letter-spacing: -0.01em;
        }

        /* ═══ Nav ═══ */
        .sidebar-nav {
          flex: 1;
          padding: 16px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .sidebar-link:hover {
          color: var(--text);
          background: var(--surface-hover);
        }
        .sidebar-link.active {
          color: var(--accent);
          background: var(--accent-muted);
        }
        .sidebar-link-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        /* ═══ Collapse Button ═══ */
        .sidebar-collapse-btn {
          display: none;
          align-items: center;
          justify-content: center;
          margin: 0 12px 8px;
          padding: 8px;
          border-radius: 8px;
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sidebar-collapse-btn:hover {
          color: var(--text);
          background: var(--surface-hover);
        }
        .sidebar-chevron { width: 16px; height: 16px; }
        @media (min-width: 768px) {
          .sidebar-collapse-btn { display: flex; }
        }

        /* ═══ User ═══ */
        .sidebar-user {
          border-top: 1px solid var(--border);
          padding: 12px 8px;
        }
        .sidebar-user-inner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
        }
        .sidebar-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--accent-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--accent);
          flex-shrink: 0;
        }
        .sidebar-username {
          font-size: 0.875rem;
          color: var(--text-secondary);
          flex: 1;
        }
        .sidebar-logout {
          padding: 6px;
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .sidebar-logout:hover { color: var(--text); }
        .sidebar-logout-icon { width: 16px; height: 16px; }
      `}</style>
    </>
  );
}
