import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import SettingsLayout from "@/components/SettingsLayout";
import AppearanceClient from "./AppearanceClient";

export default async function AppearancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id) }, select: { isAdmin: true } });

  return (
    <SettingsLayout isAdmin={user?.isAdmin ?? false}>
      <AppearanceClient />
    </SettingsLayout>
  );
}
