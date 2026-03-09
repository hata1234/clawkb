"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import TypeBadge from "./TypeBadge";
import { formatRelativeDate } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

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
  author?: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export default function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Link href={`/entries/${entry.id}`} style={{ textDecoration: "none" }}>
      <div className="entry-card card-hover">
        <div className={`type-bar type-bar-${entry.type}`} />
        {entry.images && entry.images.length > 0 && (
          <img
            src={entry.images[0].url}
            alt=""
            className="entry-card-thumb"
          />
        )}
        <div className="entry-card-inner">
          <div className="entry-badges">
            <TypeBadge type={entry.type} />
            <StatusBadge status={entry.status} />
          </div>
          <h3 className="entry-title">{entry.title}</h3>
          {entry.summary && (
            <p className="entry-summary">{entry.summary}</p>
          )}
          <div className="entry-meta">
            {entry.author && (
              <>
                <span className="entry-author">
                  {entry.author.avatarUrl ? (
                    <img src={entry.author.avatarUrl} alt="" className="entry-author-avatar-image" />
                  ) : (
                    <span className="entry-author-avatar-fallback">{entry.author.displayName.charAt(0).toUpperCase()}</span>
                  )}
                  <span className="entry-meta-item">{entry.author.displayName}</span>
                </span>
                <span className="entry-meta-dot">·</span>
              </>
            )}
            <span className="entry-meta-item">{entry.source}</span>
            <span className="entry-meta-dot">·</span>
            <span className="entry-meta-item">{formatRelativeDate(entry.createdAt)}</span>
            {entry.images && entry.images.length > 0 && (
              <>
                <span className="entry-meta-dot">·</span>
                <span className="entry-meta-item" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <ImageIcon style={{ width: 12, height: 12 }} /> {entry.images.length}
                </span>
              </>
            )}
            {entry.tags.length > 0 && (
              <>
                <span className="entry-meta-dot">·</span>
                <div className="entry-tags">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span key={tag.id} className="entry-tag">{tag.name}</span>
                  ))}
                  {entry.tags.length > 3 && (
                    <span className="entry-meta-item">+{entry.tags.length - 3}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .entry-card {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px 16px 16px 20px;
          cursor: pointer;
          overflow: hidden;
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .entry-card-thumb {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: var(--radius-md);
          flex-shrink: 0;
          border: 1px solid var(--border);
        }
        .entry-card:hover {
          border-color: var(--border-hover);
        }
        .entry-card-inner {
          min-width: 0;
        }
        .entry-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .entry-title {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          transition: color 0.15s ease;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .entry-card:hover .entry-title {
          color: var(--accent);
        }
        .entry-summary {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 6px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .entry-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .entry-author {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .entry-author-avatar-image,
        .entry-author-avatar-fallback {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          object-fit: cover;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-muted);
          color: var(--accent);
          font-size: 0.6rem;
          font-weight: 700;
          overflow: hidden;
        }
        .entry-meta-item {
          font-size: 0.75rem;
          color: var(--text-dim);
          font-weight: 500;
        }
        .entry-meta-dot {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .entry-tags {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .entry-tag {
          font-size: 0.7rem;
          background: var(--surface-hover);
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .entry-title {
            white-space: normal;
            -webkit-line-clamp: 2;
            display: -webkit-box;
            -webkit-box-orient: vertical;
          }
          .entry-tags {
            display: none;
          }
          .entry-card {
            padding: 14px 14px 14px 18px;
          }
        }
      `}</style>
    </Link>
  );
}
