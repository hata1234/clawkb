"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkInternalLinks from "@/lib/remark-internal-links";
import Link from "next/link";
import { getContentTagComponent } from "@/lib/content-tag-registry";
import type { ResolvedContentTag } from "@/lib/plugins/types";

// Ensure all content tag components are registered
import "@/components/content-tags/register";

const CONTENT_TAG_RE = /(\{\{\w+:[^}]+\}\})/g;

interface Props {
  content: string;
  resolvedTags?: ResolvedContentTag[];
}

export default function MarkdownRenderer({ content, resolvedTags }: Props) {
  // Build lookup map: placeholder → resolved tag
  const tagMap = useMemo(() => {
    const map = new Map<string, ResolvedContentTag>();
    if (resolvedTags) {
      for (const tag of resolvedTags) {
        map.set(tag.placeholder, tag);
      }
    }
    return map;
  }, [resolvedTags]);

  // If no tags, render plain markdown
  if (tagMap.size === 0) {
    return (
      <div className="prose-kb">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkInternalLinks]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Split content into segments: text and tag placeholders
  const segments = content.split(CONTENT_TAG_RE);

  return (
    <div className="prose-kb">
      {segments.map((segment, i) => {
        const resolved = tagMap.get(segment);
        if (resolved) {
          const TagComponent = getContentTagComponent(resolved.component);
          if (TagComponent) {
            return (
              <TagComponent
                key={`tag-${i}`}
                tag={resolved.tag}
                value={resolved.value}
                props={resolved.props}
              />
            );
          }
          // Unknown component — render placeholder as-is
          return <code key={`tag-${i}`} style={{ color: "var(--text-dim)" }}>{segment}</code>;
        }

        // Regular markdown segment
        if (!segment) return null;
        return (
          <ReactMarkdown
            key={`md-${i}`}
            remarkPlugins={[remarkGfm, remarkInternalLinks]}
            components={markdownComponents}
          >
            {segment}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

const markdownComponents = {
  a: ({ href, children, ...props }: React.ComponentProps<"a">) => {
    if (href?.startsWith("/entries/")) {
      const className = (props as Record<string, unknown>).className as string | undefined;
      return (
        <Link
          href={href}
          className={`internal-link${className ? ` ${className}` : ""}`}
          data-entry-id={href.replace("/entries/", "")}
        >
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};
