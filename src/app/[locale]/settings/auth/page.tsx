import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionPrincipal } from "@/lib/auth";
import { DEFAULT_AUTH, getSetting } from "@/lib/settings";
import AuthSettingsClient from "./auth-settings-client";
import SettingsLayout from "@/components/SettingsLayout";

export const dynamic = "force-dynamic";

export default async function SettingsAuthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (!principal.isAdmin) redirect("/");

  const authSettings = await getSetting("auth", DEFAULT_AUTH);

  return (
    <SettingsLayout isAdmin>
      <AuthSettingsClient initialSettings={authSettings} />
    </SettingsLayout>
  );
}
