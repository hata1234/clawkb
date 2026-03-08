import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllSettings } from "@/lib/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const settings = await getAllSettings();

  return (
    <SettingsClient initialSettings={settings} />
  );
}
