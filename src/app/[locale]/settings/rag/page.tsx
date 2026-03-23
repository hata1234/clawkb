import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionPrincipal } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import SettingsLayout from "@/components/SettingsLayout";
import RagSettingsClient from "./RagSettingsClient";

export const dynamic = "force-dynamic";

export default async function RagSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (!principal.isAdmin) redirect("/");

  const settings = await getAllSettings();

  return (
    <SettingsLayout isAdmin>
      <RagSettingsClient initialSettings={settings.rag} />
    </SettingsLayout>
  );
}
