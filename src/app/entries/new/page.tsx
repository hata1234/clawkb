import EntryForm from "@/components/EntryForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewEntryPage() {
  return (
    <div style={{ maxWidth: "42rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/entries" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back
        </Link>
        <span style={{ color: "var(--text-dim)" }}>/</span>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 400, color: "var(--text)" }}>New Entry</h1>
      </div>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: "24px",
      }}>
        <EntryForm mode="create" />
      </div>
    </div>
  );
}
