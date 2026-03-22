"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Copy, Link2, Trash2, Lock, Check, Loader2, Eye, Clock, Shield, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ShareLink {
  id: number;
  token: string;
  url: string;
  hasPassword: boolean;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  createdAt: string;
  linkedShares?: { entryId: number; title: string; token: string }[];
}

interface LinkedEntry {
  id: number;
  title: string;
}

interface ShareDialogProps {
  entryId: number;
  entryContent?: string | null;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { key: "noExpiry", value: 0 },
  { key: "1hour", value: 1 },
  { key: "24hours", value: 24 },
  { key: "7days", value: 168 },
  { key: "30days", value: 720 },
];

// Extract [[entry:ID|title]] from content
function extractInternalLinks(content: string | null | undefined): LinkedEntry[] {
  if (!content) return [];
  const regex = /\[\[entry:(\d+)\|([^\]]+)\]\]/g;
  const results: LinkedEntry[] = [];
  const seen = new Set<number>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = Number(match[1]);
    if (!seen.has(id)) {
      seen.add(id);
      results.push({ id, title: match[2] });
    }
  }
  return results;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
};

const modalStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 520,
  maxHeight: "85vh", overflow: "auto", padding: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--background)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "0.85rem",
  color: "var(--text)", outline: "none", boxSizing: "border-box",
};

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: "var(--radius-md)",
  fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", border: "none",
  transition: "all 0.15s ease",
};

export default function ShareDialog({ entryId, entryContent, onClose }: ShareDialogProps) {
  const t = useTranslations('Share');
  const tc = useTranslations('Common');
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);

  // Create form state
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryHours, setExpiryHours] = useState(0);
  const [maxViews, setMaxViews] = useState("");

  // Internal links detection
  const internalLinks = extractInternalLinks(entryContent);
  const [selectedLinkedIds, setSelectedLinkedIds] = useState<Set<number>>(
    new Set(internalLinks.map((l) => l.id)) // default: all selected
  );

  const fetchLinks = async () => {
    const res = await fetch(`/api/entries/${entryId}/share`);
    if (res.ok) {
      setLinks(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, [entryId]);

  const toggleLinked = (id: number) => {
    setSelectedLinkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLinked = () => setSelectedLinkedIds(new Set(internalLinks.map((l) => l.id)));
  const deselectAllLinked = () => setSelectedLinkedIds(new Set());

  const createLink = async () => {
    setCreating(true);
    const body: Record<string, unknown> = {};
    if (usePassword && password) body.password = password;
    if (expiryHours > 0) body.expiresInHours = expiryHours;
    if (maxViews && Number(maxViews) > 0) body.maxViews = Number(maxViews);
    if (selectedLinkedIds.size > 0) body.linkedEntryIds = Array.from(selectedLinkedIds);

    const res = await fetch(`/api/entries/${entryId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setPassword("");
      setUsePassword(false);
      setExpiryHours(0);
      setMaxViews("");
      await fetchLinks();
    }
    setCreating(false);
  };

  const revokeLink = async (linkId: number) => {
    await fetch(`/api/entries/${entryId}/share/${linkId}`, { method: "DELETE" });
    setConfirmRevoke(null);
    await fetchLinks();
  };

  const copyUrl = (link: ShareLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link2 style={{ width: 18, height: 18, color: "var(--accent)" }} />
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.15rem", color: "var(--text)" }}>{t('title')}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Create form */}
        <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Password toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)}
                style={{ accentColor: "var(--accent)" }} />
              <Shield style={{ width: 14, height: 14 }} />
              {t('passwordProtect')}
            </label>
            {usePassword && (
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enterPassword')} style={inputStyle} />
            )}

            {/* Expiry */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock style={{ width: 14, height: 14, color: "var(--text-muted)", flexShrink: 0 }} />
              <select value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))}
                style={{ ...inputStyle, width: "auto", flex: 1 }}>
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(`expiry.${opt.key}`)}</option>
                ))}
              </select>
            </div>

            {/* Max views */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Eye style={{ width: 14, height: 14, color: "var(--text-muted)", flexShrink: 0 }} />
              <input type="number" value={maxViews} onChange={(e) => setMaxViews(e.target.value)}
                placeholder={t('maxViewsPlaceholder')} min={1} style={{ ...inputStyle, flex: 1 }} />
            </div>

            {/* Internal links selection */}
            {internalLinks.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FileText style={{ width: 14, height: 14 }} />
                    {t('linkedEntries', { count: internalLinks.length })}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={selectAllLinked} style={{ ...btnBase, padding: "3px 8px", fontSize: "0.7rem", background: "transparent", color: "var(--accent)", border: "1px solid var(--border)" }}>{tc('all')}</button>
                    <button onClick={deselectAllLinked} style={{ ...btnBase, padding: "3px 8px", fontSize: "0.7rem", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{tc('none')}</button>
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 8 }}>
                  {t('linkedEntriesHint')}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {internalLinks.map((le) => (
                    <label key={le.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.8rem", color: "var(--text-secondary)", padding: "4px 0" }}>
                      <input
                        type="checkbox"
                        checked={selectedLinkedIds.has(le.id)}
                        onChange={() => toggleLinked(le.id)}
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <span style={{ opacity: selectedLinkedIds.has(le.id) ? 1 : 0.5 }}>
                        #{le.id} — {le.title}
                      </span>
                      {!selectedLinkedIds.has(le.id) && <Lock style={{ width: 11, height: 11, color: "var(--text-dim)" }} />}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button onClick={createLink} disabled={creating || (usePassword && !password)}
              style={{ ...btnBase, background: "var(--accent)", color: "var(--accent-contrast)", justifyContent: "center",
                opacity: creating || (usePassword && !password) ? 0.5 : 1 }}>
              {creating ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Link2 style={{ width: 14, height: 14 }} />}
              {t('createShareLink')}
            </button>
          </div>
        </div>

        {/* Existing links */}
        <div>
          <h3 style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            {t('activeLinks')}
          </h3>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <Loader2 style={{ width: 18, height: 18, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : links.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", textAlign: "center", padding: "16px 0" }}>
              {t('noActiveLinks')}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {links.map((link) => (
                <div key={link.id} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatDate(link.createdAt)}</span>
                    {link.hasPassword && (
                      <span style={{ fontSize: "0.7rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Lock style={{ width: 10, height: 10 }} /> {t('protected')}
                      </span>
                    )}
                    {link.expiresAt && (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                        {t('expires', { date: formatDate(link.expiresAt) })}
                      </span>
                    )}
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                      {t('views', { count: link.viewCount })}{link.maxViews !== null ? ` / ${link.maxViews} max` : ""}
                    </span>
                  </div>
                  {/* Show linked entries count */}
                  {link.linkedShares && link.linkedShares.length > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <FileText style={{ width: 11, height: 11 }} />
                      {t('includesLinked', { count: link.linkedShares.length })}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => copyUrl(link)}
                      style={{ ...btnBase, background: "var(--surface)", border: "1px solid var(--border)", color: copiedId === link.id ? "var(--accent)" : "var(--text-secondary)", fontSize: "0.75rem", padding: "5px 10px" }}>
                      {copiedId === link.id ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                      {copiedId === link.id ? tc('copied') : tc('copyUrl')}
                    </button>
                    {confirmRevoke === link.id ? (
                      <>
                        <button onClick={() => revokeLink(link.id)}
                          style={{ ...btnBase, background: "var(--danger)", color: "#fff", fontSize: "0.75rem", padding: "5px 10px" }}>
                          {t('confirmRevoke')}
                        </button>
                        <button onClick={() => setConfirmRevoke(null)}
                          style={{ ...btnBase, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "0.75rem", padding: "5px 10px" }}>
                          {tc('cancel')}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmRevoke(link.id)}
                        style={{ ...btnBase, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--danger)", fontSize: "0.75rem", padding: "5px 10px" }}>
                        <Trash2 style={{ width: 12, height: 12 }} /> {tc('revoke')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } select { color-scheme: dark; }`}</style>
      </div>
    </div>
  );
}
