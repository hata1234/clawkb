import { auth } from "@/lib/auth";
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import SettingsLayout from "@/components/SettingsLayout";
import WebhooksClient from "./WebhooksClient";

export const dynamic = "force-dynamic";

export default async function WebhooksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SettingsLayout>
      <WebhooksClient />
    </SettingsLayout>
  );
}
