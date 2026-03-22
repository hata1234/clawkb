import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAllSettings } from "@/lib/settings";
import SettingsLayout from "@/components/SettingsLayout";
import SmtpSettingsClient from "./SmtpSettingsClient";

export default async function SmtpSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) redirect("/login");

  const settings = await getAllSettings();

  return (
    <SettingsLayout>
      <SmtpSettingsClient initialSettings={settings.smtp} />
    </SettingsLayout>
  );
}
