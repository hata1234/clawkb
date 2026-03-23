"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import CommandSearch from "./CommandSearch";
import FloatingChat from "./FloatingChat";
import { Loader2 } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/share/");

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicPage) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, isPublicPage, pathname, router]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
      >
        <Loader2 style={{ width: 24, height: 24, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Redirect will happen via useEffect, show nothing while redirecting
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        userName={session?.user?.name || undefined}
        avatarUrl={session?.user?.avatarUrl || undefined}
        isAdmin={session?.user?.isAdmin || false}
      />
      <CommandSearch />
      <FloatingChat />
      <main id="main-content" className="min-h-screen">
        <div id="main-inner">{children}</div>
      </main>
      <style>{`
        #main-content {
          margin-left: 0;
          transition: margin-left 0.2s ease;
        }
        #main-inner {
          max-width: 72rem;
          margin: 0 auto;
          padding: 64px 16px 24px 16px;
        }
        @media (min-width: 768px) {
          #main-content {
            margin-left: 240px;
            transition: margin-left 0.2s ease;
          }
          .sidebar.collapsed ~ #main-content {
            margin-left: 68px;
          }
          #main-inner {
            padding: 32px 32px;
          }
        }
      `}</style>
    </div>
  );
}
