import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsLayout from "@/components/SettingsLayout";
import PermissionsClient from "./permissions-client";

export default async function PermissionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.effectiveRole !== "admin") redirect("/settings");

  return (
    <SettingsLayout>
      <PermissionsClient />
    </SettingsLayout>
  );
}
