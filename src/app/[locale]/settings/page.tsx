import { auth } from "@/lib/auth";
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getAllSettings } from "@/lib/settings";
import SettingsClient from "./SettingsClient";
import SettingsLayout from "@/components/SettingsLayout";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) redirect("/login");

  const settings = await getAllSettings();

  return (
    <SettingsLayout>
      <SettingsClient initialSettings={settings} />
    </SettingsLayout>
  );
}
