import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionPrincipal } from "@/lib/auth";
import { DEFAULT_AUTH, getSetting } from "@/lib/settings";
import AuthSettingsClient from "./auth-settings-client";

export default async function SettingsAuthPage() {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (principal.effectiveRole !== "admin") redirect("/");

  const authSettings = await getSetting("auth", DEFAULT_AUTH);

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 400, marginBottom: 6 }}>Auth Settings</h1>
          <p style={{ color: "var(--text-secondary)" }}>Configure member registration, approval, email verification, and agent onboarding.</p>
        </div>
        <Link href="/settings" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.9rem" }}>Back to settings</Link>
      </div>
      <AuthSettingsClient initialSettings={authSettings} />
    </div>
  );
}
