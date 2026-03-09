import { redirect } from "next/navigation";
import { getSessionPrincipal } from "@/lib/auth";
import UsersAdminClient from "./users-admin-client";
import SettingsLayout from "@/components/SettingsLayout";

export default async function SettingsUsersPage() {
  const principal = await getSessionPrincipal();
  if (!principal) redirect("/login");
  if (principal.effectiveRole !== "admin") redirect("/");

  return (
    <SettingsLayout>
      <UsersAdminClient />
    </SettingsLayout>
  );
}
