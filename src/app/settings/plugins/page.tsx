import { redirect } from "next/navigation";
import { getSessionPrincipal } from "@/lib/auth";
import PluginsAdminClient from "./plugins-admin-client";
import SettingsLayout from "@/components/SettingsLayout";

export default async function SettingsPluginsPage() {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (principal.effectiveRole !== "admin") redirect("/");

  return (
    <SettingsLayout>
      <PluginsAdminClient />
    </SettingsLayout>
  );
}
