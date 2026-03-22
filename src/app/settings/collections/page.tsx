import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsLayout from "@/components/SettingsLayout";
import CollectionsClient from "./CollectionsClient";

export default async function SettingsCollectionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SettingsLayout>
      <CollectionsClient />
    </SettingsLayout>
  );
}
