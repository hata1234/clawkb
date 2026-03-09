import { redirect } from "next/navigation";
import { getSessionPrincipal } from "@/lib/auth";
import { DEFAULT_AUTH, getSetting } from "@/lib/settings";
import AuthSettingsClient from "./auth-settings-client";
import SettingsLayout from "@/components/SettingsLayout";

export default async function SettingsAuthPage() {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (principal.effectiveRole !== "admin") redirect("/");

  const authSettings = await getSetting("auth", DEFAULT_AUTH);

  return (
    <SettingsLayout>
      <AuthSettingsClient initialSettings={authSettings} />
    </SettingsLayout>
  );
}
