import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExportClient from "./ExportClient";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <ExportClient />;
}
