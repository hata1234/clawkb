"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        userName={session?.user?.name || undefined}
        avatarUrl={session?.user?.avatarUrl || undefined}
        effectiveRole={session?.user?.effectiveRole || undefined}
      />
      <main id="main-content" className="min-h-screen">
        <div id="main-inner">
          {children}
        </div>
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
