import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsLayout from "@/components/SettingsLayout";
import WebhooksClient from "./WebhooksClient";

export default async function WebhooksPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SettingsLayout>
      <WebhooksClient />
    </SettingsLayout>
  );
}
