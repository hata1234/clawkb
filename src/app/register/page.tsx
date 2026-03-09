"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "12px 16px",
  fontSize: "0.9rem",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    displayName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    if (data.requiresEmailVerification && data.verificationToken) {
      setMessage(`Registered. Verify token: ${data.verificationToken}`);
      return;
    }

    if (data.requiresAdminApproval) {
      setMessage("Registered. Your account is pending admin approval.");
      return;
    }

    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", paddingTop: 48 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 400, marginBottom: 8 }}>Create Account</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Register with username, email, and password.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <input value={form.username} onChange={(e) => setForm((current) => ({ ...current, username: e.target.value }))} placeholder="Username" style={inputStyle} required />
        <input value={form.displayName} onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))} placeholder="Display name (optional)" style={inputStyle} />
        <input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="Email" style={inputStyle} required />
        <input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} placeholder="Password" style={inputStyle} required />

        {error ? <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div> : null}
        {message ? <div style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{message}</div> : null}

        <button type="submit" disabled={loading} style={{ border: "none", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--accent-contrast)", padding: "12px 16px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : null}
          Register
        </button>
      </form>

      <p style={{ marginTop: 16, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Already have an account? <Link href="/login" style={{ color: "var(--accent)" }}>Sign in</Link>
      </p>
    </div>
  );
}
