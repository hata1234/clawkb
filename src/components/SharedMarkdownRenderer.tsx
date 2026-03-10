"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkInternalLinks from "@/lib/remark-internal-links";
import { Lock } from "lucide-react";

interface LinkedShare {
  token: string;
  title: string;
  url: string;
}

interface Props {
  content: string;
  linkedShares: Record<number, LinkedShare>; // entryId → share info
}

/**
 * Markdown renderer for shared (public) pages.
 * Internal links [[entry:ID|title]] are replaced with:
 * - Share link → if the linked entry has been shared (clickable pill)
 * - Lock icon → if the linked entry is NOT shared (non-clickable, grayed out)
 */
export default function SharedMarkdownRenderer({ content, linkedShares }: Props) {
  return (
    <div className="prose-kb">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkInternalLinks]}
        components={{
          a: ({ href, children, ...props }) => {
            // Internal entry links → check if shared
            if (href?.startsWith("/entries/")) {
              const entryId = Number(href.replace("/entries/", ""));
              const shared = linkedShares[entryId];

              if (shared) {
                // Linked entry IS shared → clickable link to share page
                return (
                  <a
                    href={shared.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "1px 8px",
                      borderRadius: 999,
                      fontSize: "0.85em",
                      background: "var(--accent-muted, rgba(201,169,110,0.12))",
                      color: "var(--accent, #C9A96E)",
                      textDecoration: "none",
                      fontWeight: 500,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent-muted, rgba(201,169,110,0.2))";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--accent-muted, rgba(201,169,110,0.12))";
                    }}
                  >
                    {children}
                  </a>
                );
              } else {
                // Linked entry NOT shared → show lock
                return (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "1px 8px",
                      borderRadius: 999,
                      fontSize: "0.85em",
                      background: "var(--surface-hover, rgba(255,255,255,0.04))",
                      color: "var(--text-dim, #555)",
                      cursor: "default",
                    }}
                    title="This linked entry is not included in this share"
                  >
                    <Lock style={{ width: 12, height: 12 }} />
                    {children}
                  </span>
                );
              }
            }
            // External links → open in new tab
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
