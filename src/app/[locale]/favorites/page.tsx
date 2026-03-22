"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import EntryCard from "@/components/EntryCard";
import { Star } from "lucide-react";

interface Entry {
  id: number;
  type: string;
  source: string;
  title: string;
  summary?: string | null;
  status: string;
  createdAt: string;
  tags: { id: number; name: string }[];
  images?: { id: number; url: string }[];
  isFavorited?: boolean;
  author?: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export default function FavoritesPage() {
  const t = useTranslations('Favorites');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => { setEntries(data.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleFavorite = async (entryId: number) => {
    const res = await fetch(`/api/entries/${entryId}/favorite`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.favorited) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{t('label')}</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text)" }}>{t('title')}</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 2 }}>{t('count', { count: entries.length })}</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, height: 80 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <Star style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: "0.875rem" }}>{t('empty')}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => <EntryCard key={entry.id} entry={entry} onToggleFavorite={toggleFavorite} />)}
        </div>
      )}
    </div>
  );
}
