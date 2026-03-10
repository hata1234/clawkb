"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid username or password");
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.push(callbackUrl);
      router.refresh();
    }
  };

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
    letterSpacing: "0.01em",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--background)",
      padding: "24px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 380, position: "relative", zIndex: 1 }}>
        {/* Logo: icon + CSS text */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
          <Image
            src="/logo-clawkb-icon.png"
            alt="ClawKB"
            width={72}
            height={72}
            style={{ marginBottom: 20 }}
            priority
          />
          <h1 style={{
            fontSize: "2rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 8,
            lineHeight: 1,
          }}>
            <span style={{ color: "var(--text)" }}>Claw</span>
            <span style={{ color: "var(--accent)" }}>KB</span>
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Sign in to continue</p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "32px 28px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 8,
                letterSpacing: "0.02em",
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 8,
                letterSpacing: "0.02em",
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div style={{
                fontSize: "0.85rem",
                color: "var(--danger)",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.15)",
                borderRadius: "var(--radius-md)",
                padding: "10px 16px",
              }}>
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
                marginTop: 4,
                letterSpacing: "0.01em",
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: "0.7rem",
          color: "var(--text-dim)",
          marginTop: 24,
        }}>
          Knowledge base for Human–AI Agent collaboration
          <br />
          <Link href="/register" style={{ color: "var(--accent)", textDecoration: "none" }}>Create an account</Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px rgba(201,169,110,0.1);
        }
        input::placeholder { color: var(--text-dim); }
        input { color-scheme: dark; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
