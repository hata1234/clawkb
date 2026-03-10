"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkInternalLinks from "@/lib/remark-internal-links";
import Link from "next/link";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-kb">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkInternalLinks]}
        components={{
          a: ({ href, children, ...props }) => {
            // Internal entry links → use Next.js Link for client-side navigation
            if (href?.startsWith("/entries/")) {
              const className = (props as Record<string, unknown>).className;
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
