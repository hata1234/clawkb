import { auth } from "@/lib/auth";
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getAllSettings } from "@/lib/settings";
import SettingsLayout from "@/components/SettingsLayout";
import RagSettingsClient from "./RagSettingsClient";

export const dynamic = "force-dynamic";

export default async function RagSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) redirect("/login");

  const settings = await getAllSettings();

  return (
    <SettingsLayout>
      <RagSettingsClient initialSettings={settings.rag} />
    </SettingsLayout>
  );
}
