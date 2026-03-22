import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionPrincipal } from "@/lib/auth";
import PluginsAdminClient from "./plugins-admin-client";
import SettingsLayout from "@/components/SettingsLayout";

export default async function SettingsPluginsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (principal.effectiveRole !== "admin") redirect("/");

  return (
    <SettingsLayout>
      <PluginsAdminClient />
    </SettingsLayout>
  );
}
