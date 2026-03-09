import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionPrincipal } from "@/lib/auth";
import UsersAdminClient from "./users-admin-client";

export default async function SettingsUsersPage() {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (principal.effectiveRole !== "admin") redirect("/");

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 400, marginBottom: 6 }}>User Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Approve registrations, assign roles, and manage role groups.</p>
        </div>
        <Link href="/settings" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.9rem" }}>Back to settings</Link>
      </div>
      <UsersAdminClient />
    </div>
  );
}
