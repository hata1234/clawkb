export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsLayout from "@/components/SettingsLayout";
import NotificationPrefsClient from "./notifications-client";

export default async function NotificationPrefsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) }, select: { isAdmin: true } });
  const isAdmin = user?.isAdmin ?? false;

  return (
    <SettingsLayout isAdmin={isAdmin}>
      <NotificationPrefsClient />
    </SettingsLayout>
  );
}
