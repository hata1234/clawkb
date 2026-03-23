export const dynamic = "force-dynamic";

import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSessionPrincipal } from "@/lib/auth";
import SettingsLayout from "@/components/SettingsLayout";
import GroupsClient from "./groups-client";

export default async function GroupsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (!principal.isAdmin) redirect("/");

  return (
    <SettingsLayout isAdmin>
      <GroupsClient />
    </SettingsLayout>
  );
}
