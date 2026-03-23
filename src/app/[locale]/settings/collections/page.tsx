import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSessionPrincipal } from "@/lib/auth";
import SettingsLayout from "@/components/SettingsLayout";
import CollectionsClient from "./CollectionsClient";

export const dynamic = "force-dynamic";

export default async function SettingsCollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (!principal.isAdmin) redirect("/");

  return (
    <SettingsLayout isAdmin>
      <CollectionsClient />
    </SettingsLayout>
  );
}
