"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Tag,
  Settings,
  Clock,
  Network,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Star,
  Trash2,
  Activity,
  Search,
  Library,
  Bot,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "./ThemeProvider";
import { Suspense } from "react";
import CollectionTree from "./CollectionTree";

const browseItems = [
  { href: "/entries",     label: "Entries",    icon: FileText },
  { href: "/favorites",   label: "Favorites",  icon: Star },
  { href: "/timeline",    label: "Timeline",   icon: Clock },
  { href: "/graph",       label: "Graph",      icon: Network },
  { href: "/tags",        label: "Tags",       icon: Tag },
];

const browseHrefs = new Set(browseItems.map((i) => i.href));

type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  id?: string;
};

export default function Sidebar({
  userName,
  avatarUrl,
  effectiveRole,
}: {
  userName?: string;
  avatarUrl?: string;
  effectiveRole?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(() => {
    // Auto-expand if user is on a browse page
    return browseHrefs.has(pathname);
  });
  const [pluginItems, setPluginItems] = useState<Array<{ id: string; label: string; href: string }>>([]);
  const [trashCount, setTrashCount] = useState(0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetch("/api/plugins/sidebar")
      .then((res) => res.ok ? res.json() : { items: [] })
      .then((data) => setPluginItems(data.items || []))
      .catch(() => setPluginItems([]));
  }, []);

  useEffect(() => {
    if (effectiveRole === "admin") {
      fetch("/api/trash")
        .then((res) => res.ok ? res.json() : { total: 0 })
        .then((data) => setTrashCount(data.total || 0))
        .catch(() => setTrashCount(0));
    }
  }, [effectiveRole]);

  // Auto-expand browse when navigating to a browse page
  useEffect(() => {
    if (browseHrefs.has(pathname)) setBrowseOpen(true);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isBrowseActive = browseItems.some((item) => isActive(item.href));

  const nav = (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <Image
          src="/logo-clawkb-icon.png"
          alt="ClawKB"
          width={36}
          height={36}
          className="sidebar-logo-icon"
          priority
        />
        <span className="sidebar-logo-text">
          <span className="sidebar-logo-claw">Claw</span>
          <span className="sidebar-logo-kb">KB</span>
        </span>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav">
        {/* Dashboard */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Dashboard" : undefined}
          className={`sidebar-link ${isActive("/") && pathname === "/" ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
        >
          <LayoutDashboard className="sidebar-link-icon" />
          <span className="sidebar-link-label">Dashboard</span>
        </Link>

        {/* Search */}
        <Link
          href="/search"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Search" : undefined}
          className={`sidebar-link ${isActive("/search") ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
        >
          <Search className="sidebar-link-icon" />
          <span className="sidebar-link-label">Search</span>
        </Link>

        {/* Ask AI */}
        <Link
          href="/rag"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Ask AI" : undefined}
          className={`sidebar-link ${isActive("/rag") ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
        >
          <Bot className="sidebar-link-icon" />
          <span className="sidebar-link-label">Ask AI</span>
        </Link>

        {/* Browse group */}
        {collapsed ? (
          <Link
            href="/entries"
            title="Browse"
            className={`sidebar-link ${isBrowseActive ? "active" : ""} collapsed`}
          >
            <Library className="sidebar-link-icon" />
          </Link>
        ) : (
          <div className="sidebar-group">
            <button
              className={`sidebar-link sidebar-group-toggle ${isBrowseActive ? "active" : ""}`}
              onClick={() => setBrowseOpen(!browseOpen)}
            >
              <Library className="sidebar-link-icon" />
              <span className="sidebar-link-label">Browse</span>
              <ChevronDown
                className="sidebar-group-chevron"
                style={{ transform: browseOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
              />
            </button>
            {browseOpen && (
              <div className="sidebar-group-children">
                {browseItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`sidebar-link sidebar-child-link ${isActive(item.href) ? "active" : ""}`}
                    >
                      <Icon className="sidebar-link-icon" />
                      <span className="sidebar-link-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Activity */}
        <Link
          href="/activity"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Activity" : undefined}
          className={`sidebar-link ${isActive("/activity") ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
        >
          <Activity className="sidebar-link-icon" />
          <span className="sidebar-link-label">Activity</span>
        </Link>

        {/* Import */}
        <Link
          href="/import"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Import" : undefined}
          className={`sidebar-link ${isActive("/import") ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
        >
          <Upload className="sidebar-link-icon" />
          <span className="sidebar-link-label">Import</span>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Settings" : undefined}
          className={`sidebar-link ${isActive("/settings") ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
        >
          <Settings className="sidebar-link-icon" />
          <span className="sidebar-link-label">Settings</span>
        </Link>

        {/* Trash (admin only) */}
        {effectiveRole === "admin" && (
          <Link
            href="/trash"
            onClick={() => setMobileOpen(false)}
            title={collapsed ? "Trash" : undefined}
            className={`sidebar-link ${isActive("/trash") ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
          >
            <Trash2 className="sidebar-link-icon" />
            <span className="sidebar-link-label">
              Trash
              {trashCount > 0 && (
                <span style={{ marginLeft: 6, fontSize: "0.65rem", background: "var(--danger)", color: "#fff", padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>{trashCount}</span>
              )}
            </span>
          </Link>
        )}

        {/* Plugin items */}
        {pluginItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? item.label : undefined}
            className={`sidebar-link ${isActive(item.href) ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
          >
            <span className="sidebar-plugin-dot" />
            <span className="sidebar-link-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Collection tree */}
      <Suspense fallback={null}><CollectionTree collapsed={collapsed} /></Suspense>

      {/* Theme toggle + Collapse toggle */}
      <div className="sidebar-bottom-actions">
        <button
          onClick={toggleTheme}
          className="sidebar-theme-btn"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="sidebar-theme-icon" /> : <Moon className="sidebar-theme-icon" />}
          <span className="sidebar-link-label">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-collapse-btn"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="sidebar-chevron" /> : <ChevronLeft className="sidebar-chevron" />}
        </button>
      </div>

      {/* User section — click to go to Profile */}
      <Link href="/profile" className="sidebar-user" onClick={() => setMobileOpen(false)}>
        <div className="sidebar-user-inner">
          <div className="sidebar-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="sidebar-avatar-image" />
            ) : (
              userName?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          <div className="sidebar-user-copy">
            <span className="sidebar-username">{userName || "User"}</span>
            {effectiveRole ? <span className="sidebar-user-role">{effectiveRole}</span> : null}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); signOut({ callbackUrl: "/login" }); }}
            className="sidebar-logout"
            title="Sign out"
          >
            <LogOut className="sidebar-logout-icon" />
          </button>
        </div>
      </Link>
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
            overflow: hidden;
          }
          .sidebar.collapsed .sidebar-logo-text,
          .sidebar.collapsed .sidebar-link-label,
          .sidebar.collapsed .sidebar-username,
          .sidebar.collapsed .sidebar-logout,
          .sidebar.collapsed .sidebar-group-chevron,
          .sidebar.collapsed .sidebar-user-copy {
            display: none;
          }
          .sidebar.collapsed .sidebar-theme-btn {
            justify-content: center;
          }
          .sidebar.collapsed .sidebar-user-inner {
            justify-content: center;
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
          gap: 12px;
          padding: 16px 16px;
          border-bottom: 1px solid var(--border);
          min-height: 65px;
        }
        .sidebar-logo-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
        }
        .sidebar-logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .sidebar-logo-claw {
          color: var(--text);
        }
        .sidebar-logo-kb {
          color: var(--accent);
        }

        /* ═══ Nav ═══ */
        .sidebar-nav {
          flex: 1;
          padding: 16px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
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
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
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
        .sidebar-plugin-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
          margin: 0 5px;
          flex-shrink: 0;
        }

        /* ═══ Browse Group ═══ */
        .sidebar-group {
          display: flex;
          flex-direction: column;
        }
        .sidebar-group-toggle {
          position: relative;
        }
        .sidebar-group-chevron {
          width: 14px;
          height: 14px;
          margin-left: auto;
          color: var(--text-dim);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .sidebar-group-children {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding-left: 12px;
        }
        .sidebar-child-link {
          padding: 7px 12px;
          font-size: 0.82rem;
        }
        .sidebar-child-link .sidebar-link-icon {
          width: 16px;
          height: 16px;
        }

        /* ═══ Bottom Actions ═══ */
        .sidebar-bottom-actions {
          padding: 0 8px 4px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* ═══ Theme Toggle ═══ */
        .sidebar-theme-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
        }
        .sidebar-theme-btn:hover {
          color: var(--text);
          background: var(--surface-hover);
        }
        .sidebar-theme-icon { width: 18px; height: 18px; flex-shrink: 0; }

        /* ═══ Collapse Button ═══ */
        .sidebar-collapse-btn {
          display: none;
          align-items: center;
          justify-content: center;
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
          text-decoration: none;
          display: block;
          transition: background 0.15s;
          border-radius: 0;
        }
        .sidebar-user:hover {
          background: var(--surface-hover);
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
          overflow: hidden;
        }
        .sidebar-avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sidebar-user-copy {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .sidebar-username {
          font-size: 0.875rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-user-role {
          font-size: 0.66rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.08em;
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
