import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllSettings } from "@/lib/settings";
import SettingsLayout from "@/components/SettingsLayout";
import RagSettingsClient from "./RagSettingsClient";

export default async function RagSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const settings = await getAllSettings();

  return (
    <SettingsLayout>
      <RagSettingsClient initialSettings={settings.rag} />
    </SettingsLayout>
  );
}
