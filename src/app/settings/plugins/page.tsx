import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionPrincipal } from "@/lib/auth";
import PluginsAdminClient from "./plugins-admin-client";

export default async function SettingsPluginsPage() {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (principal.effectiveRole !== "admin") redirect("/");

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 400, marginBottom: 6 }}>Plugin Manager</h1>
          <p style={{ color: "var(--text-secondary)" }}>Enable, disable, install, and remove filesystem plugins.</p>
        </div>
        <Link href="/settings" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.9rem" }}>Back to settings</Link>
      </div>
      <PluginsAdminClient />
    </div>
  );
}
