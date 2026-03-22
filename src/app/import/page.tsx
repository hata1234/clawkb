import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <ImportClient />;
}
