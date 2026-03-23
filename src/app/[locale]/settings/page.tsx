import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import SettingsClient from "./SettingsClient";
import SettingsLayout from "@/components/SettingsLayout";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) }, select: { isAdmin: true } });
  const isAdmin = user?.isAdmin ?? false;

  // Non-admin users can only access notifications settings
  if (!isAdmin) redirect(`/${locale}/settings/notifications`);

  const settings = await getAllSettings();

  return (
    <SettingsLayout isAdmin={isAdmin}>
      <SettingsClient initialSettings={settings} />
    </SettingsLayout>
  );
}
