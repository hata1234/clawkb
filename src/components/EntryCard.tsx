"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import TypeBadge from "./TypeBadge";
import { formatRelativeDate } from "@/lib/utils";
import { Image as ImageIcon, Star, Link as LinkIcon, Tag, AlertCircle, CheckCircle, Info, Zap } from "lucide-react";

interface CardElement {
  id: string;
  type: "badge" | "icon" | "indicator";
  position: "top-right" | "bottom-left" | "meta-row";
  label?: string;
  icon?: string;
  color?: string;
  tooltip?: string;
}

interface Entry {
  id: number;
  type: string;
  source: string;
  title: string;
  summary?: string | null;
  status: string;
  createdAt: string;
  tags: { id: number; name: string }[];
  collections?: { id: number; name: string; icon?: string | null; color?: string | null }[];
  images?: { id: number; url: string }[];
  isFavorited?: boolean;
  cardElements?: CardElement[];
  author?: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  link: LinkIcon,
  tag: Tag,
  "alert-circle": AlertCircle,
  "check-circle": CheckCircle,
  info: Info,
  zap: Zap,
  star: Star,
};

function CardElementBadge({ el }: { el: CardElement }) {
  return (
    <span
      className="card-el-badge"
      style={{ background: el.color || "var(--accent-muted)", color: el.color ? "#fff" : "var(--accent)" }}
      title={el.tooltip}
    >
      {el.label || el.id}
    </span>
  );
}

function CardElementIcon({ el }: { el: CardElement }) {
  const Icon = el.icon ? ICON_MAP[el.icon] : null;
  return (
    <span className="card-el-icon" title={el.tooltip} style={{ color: el.color || "var(--text-dim)" }}>
      {Icon ? <Icon style={{ width: 14, height: 14 }} /> : <span>{el.icon || "?"}</span>}
    </span>
  );
}

function CardElementIndicator({ el }: { el: CardElement }) {
  return (
    <span
      className="card-el-indicator"
      style={{ background: el.color || "var(--accent)" }}
      title={el.tooltip}
    />
  );
}

function renderCardElement(el: CardElement) {
  switch (el.type) {
    case "badge": return <CardElementBadge key={el.id} el={el} />;
    case "icon": return <CardElementIcon key={el.id} el={el} />;
    case "indicator": return <CardElementIndicator key={el.id} el={el} />;
    default: return null;
  }
}

export default function EntryCard({ entry, onToggleFavorite }: { entry: Entry; onToggleFavorite?: (id: number) => void }) {
  const topRight = entry.cardElements?.filter((el) => el.position === "top-right") || [];
  const bottomLeft = entry.cardElements?.filter((el) => el.position === "bottom-left") || [];
  const metaRow = entry.cardElements?.filter((el) => el.position === "meta-row") || [];

  return (
    <Link href={`/entries/${entry.id}`} style={{ textDecoration: "none" }}>
      <div className="entry-card card-hover">
        <div className={`type-bar type-bar-${entry.type}`} />
        {topRight.length > 0 && (
          <div className="card-el-top-right">
            {topRight.map((el) => renderCardElement(el))}
          </div>
        )}
        {onToggleFavorite && (
          <button
            className="entry-card-star"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(entry.id); }}
            title={entry.isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star style={{ width: 16, height: 16, fill: entry.isFavorited ? "var(--accent)" : "none", color: entry.isFavorited ? "var(--accent)" : "var(--text-dim)" }} />
          </button>
        )}
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
            {entry.collections && entry.collections.length > 0 && (
              <>
                <span className="entry-meta-dot">·</span>
                <div className="entry-tags">
                  {entry.collections.slice(0, 2).map((col) => (
                    <span key={col.id} className="entry-collection-pill" style={col.color ? { borderColor: col.color, color: col.color } : undefined}>
                      {col.icon || "📁"} {col.name}
                    </span>
                  ))}
                  {entry.collections.length > 2 && (
                    <span className="entry-meta-item">+{entry.collections.length - 2}</span>
                  )}
                </div>
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
            {metaRow.length > 0 && metaRow.map((el) => (
              <span key={el.id}>
                <span className="entry-meta-dot">·</span>
                {renderCardElement(el)}
              </span>
            ))}
          </div>
        </div>
        {bottomLeft.length > 0 && (
          <div className="card-el-bottom-left">
            {bottomLeft.map((el) => renderCardElement(el))}
          </div>
        )}
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
        .entry-card-star {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          z-index: 2;
          transition: transform 0.15s ease;
        }
        .entry-card-star:hover {
          transform: scale(1.2);
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
        .entry-collection-pill {
          font-size: 0.65rem;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 1px 7px;
          border-radius: 999px;
          white-space: nowrap;
          font-weight: 500;
        }
        .card-el-top-right {
          position: absolute;
          top: 10px;
          right: 32px;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 2;
        }
        .card-el-bottom-left {
          position: absolute;
          bottom: 8px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .card-el-badge {
          font-size: 0.65rem;
          padding: 1px 7px;
          border-radius: 999px;
          font-weight: 600;
          white-space: nowrap;
        }
        .card-el-icon {
          display: inline-flex;
          align-items: center;
          cursor: default;
        }
        .card-el-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
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
