"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
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

export default function ForgotPasswordPage() {
  const t = useTranslations("ForgotPassword");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || t("failed"));
      }
    } catch (err) {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 380, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
          <Image
            src="/logo-clawkb-icon.png"
            alt="ClawKB"
            width={72}
            height={72}
            style={{ marginBottom: 20 }}
            priority
          />
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>{t("title")}</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>{t("subtitle")}</p>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "32px 28px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          {sent ? (
            <div>
              <p style={{ color: "var(--success)", fontSize: "0.9rem", marginBottom: 16 }}>{t("sentMessage")}</p>
              <Link href="/login" style={{ color: "var(--accent)", fontSize: "0.85rem", textDecoration: "none" }}>
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  placeholder={t("emailPlaceholder")}
                  required
                />
              </div>

              {error && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--danger)",
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.15)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 16px",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  borderRadius: "var(--radius-md)",
                  padding: "13px 16px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    {t("sending")}
                  </>
                ) : (
                  t("sendResetLink")
                )}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 24 }}>
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>
            {t("backToLogin")}
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(201,169,110,0.1); }
        input::placeholder { color: var(--text-dim); }
      `}</style>
    </div>
  );
}
