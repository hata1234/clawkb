import { Suspense } from "react";
import KnowledgeGraph from "@/components/KnowledgeGraph";

export const metadata = {
  title: "Knowledge Graph — ClawKB",
};

export default function GraphPage() {
  return (
    <Suspense>
      <KnowledgeGraph />
    </Suspense>
  );
}
