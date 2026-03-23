import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import KnowledgeGraph from "@/components/KnowledgeGraph";

export const metadata = {
  title: "Knowledge Graph — ClawKB",
};

export default async function GraphPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <KnowledgeGraph />
    </Suspense>
  );
}
