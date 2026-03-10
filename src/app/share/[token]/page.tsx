"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SharedMarkdownRenderer from "@/components/SharedMarkdownRenderer";
import { Lock, Loader2, AlertCircle, Clock, Tag, BookOpen } from "lucide-react";

interface LinkedShare {
  token: string;
  title: string;
  url: string;
}

interface SharedEntry {
  title: string;
  summary: string | null;
  content: string | null;
  images: { url: string; filename: string; caption: string | null }[];
  tags: string[];
  author: { displayName: string; avatarUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
  linkedShares: Record<number, LinkedShare>;
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh", background: "var(--background)",
  display: "flex", flexDirection: "column",
};

const mainStyle: React.CSSProperties = {
  flex: 1, maxWidth: "48rem", margin: "0 auto",
  padding: "40px 20px", width: "100%",
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--background)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: "0.9rem",
  color: "var(--text)", outline: "none", boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "10px 20px", borderRadius: "var(--radius-md)",
  fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", border: "none",
  background: "var(--accent)", color: "var(--accent-contrast)",
  transition: "all 0.15s ease",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [entry, setEntry] = useState<SharedEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const fetchEntry = async () => {
      const res = await fetch(`/api/share/${token}`);
      if (res.ok) {
        setEntry(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.requiresPassword) {
          setNeedsPassword(true);
        } else {
          setError(data.error || "This link is no longer available");
        }
      }
      setLoading(false);
    };
    fetchEntry();
  }, [token]);

  const submitPassword = async () => {
    setVerifying(true);
    setPasswordError(false);
    const res = await fetch(`/api/share/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setEntry(await res.json());
      setNeedsPassword(false);
    } else {
      setPasswordError(true);
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ ...mainStyle, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader2 style={{ width: 28, height: 28, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ ...mainStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <AlertCircle style={{ width: 40, height: 40, color: "var(--text-dim)", marginBottom: 16 }} />
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", color: "var(--text)", marginBottom: 8 }}>
            Unavailable
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 400 }}>{error}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div style={containerStyle}>
        <div style={{ ...mainStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...cardStyle, maxWidth: 380, width: "100%", textAlign: "center" }}>
            <Lock style={{ width: 32, height: 32, color: "var(--accent)", marginBottom: 16 }} />
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem", color: "var(--text)", marginBottom: 8 }}>
              Password Required
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>
              This shared entry is password protected.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" && password) submitPassword(); }}
                placeholder="Enter password"
                style={{ ...inputStyle, borderColor: passwordError ? "var(--danger)" : "var(--border)" }}
                autoFocus
              />
              {passwordError && (
                <p style={{ fontSize: "0.8rem", color: "var(--danger)", margin: 0 }}>Incorrect password</p>
              )}
              <button onClick={submitPassword} disabled={!password || verifying} style={{ ...btnStyle, justifyContent: "center", opacity: !password || verifying ? 0.5 : 1 }}>
                {verifying ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Lock style={{ width: 14, height: 14 }} />}
                Unlock
              </button>
            </div>
          </div>
        </div>
        <Footer />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } select { color-scheme: dark; } input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 2px rgba(201,169,110,0.15); }`}</style>
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div style={containerStyle}>
      <div style={mainStyle}>
        {/* Hero */}
        <div style={cardStyle}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 400, color: "var(--text)", marginBottom: 16, lineHeight: 1.3 }}>
            {entry.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: entry.tags.length > 0 ? 16 : 0 }}>
            {entry.author && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, overflow: "hidden", background: "var(--accent-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: "0.65rem", fontWeight: 700 }}>
                  {entry.author.avatarUrl
                    ? <img src={entry.author.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : entry.author.displayName.charAt(0).toUpperCase()}
                </span>
                {entry.author.displayName}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Clock style={{ width: 14, height: 14 }} /> {formatDate(entry.createdAt)}
            </span>
          </div>
          {entry.tags.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag style={{ width: 14, height: 14, color: "var(--text-dim)", flexShrink: 0 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {entry.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: "0.75rem", background: "var(--surface-hover)", color: "var(--text-secondary)", padding: "3px 10px", borderRadius: 999 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Images */}
        {entry.images.length > 0 && (
          <div style={cardStyle}>
            <div className="share-image-grid">
              {entry.images.map((img, i) => (
                <div key={i}>
                  <a href={img.url} target="_blank" rel="noopener noreferrer">
                    <img src={img.url} alt={img.caption || img.filename}
                      style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "var(--radius-md)", display: "block", border: "1px solid var(--border)" }} />
                  </a>
                  {img.caption && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>{img.caption}</p>}
                </div>
              ))}
            </div>
            <style>{`.share-image-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; } @media (min-width: 640px) { .share-image-grid { grid-template-columns: repeat(3, 1fr); } }`}</style>
          </div>
        )}

        {/* Summary */}
        {entry.summary && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Summary
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{entry.summary}</p>
          </div>
        )}

        {/* Content */}
        {entry.content && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Content
            </h2>
            <SharedMarkdownRenderer content={entry.content} linkedShares={entry.linkedShares || {}} />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ textAlign: "center", padding: "24px 20px", fontSize: "0.75rem", color: "var(--text-dim)", borderTop: "1px solid var(--border)" }}>
      <a href="/" style={{ color: "var(--text-dim)", textDecoration: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <BookOpen style={{ width: 14, height: 14 }} />
          Powered by ClawKB
        </span>
      </a>
    </footer>
  );
}
