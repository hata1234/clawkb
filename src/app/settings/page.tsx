import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllSettings } from "@/lib/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const settings = await getAllSettings();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/settings/users" style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", color: "var(--text)", textDecoration: "none", background: "var(--surface)" }}>
          User Management
        </Link>
        <Link href="/settings/auth" style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", color: "var(--text)", textDecoration: "none", background: "var(--surface)" }}>
          Auth Settings
        </Link>
        <Link href="/settings/plugins" style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", color: "var(--text)", textDecoration: "none", background: "var(--surface)" }}>
          Plugin Manager
        </Link>
      </div>
      <SettingsClient initialSettings={settings} />
    </div>
  );
}
