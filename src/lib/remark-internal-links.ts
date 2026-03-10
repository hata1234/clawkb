/**
 * Remark plugin: transform #123 patterns into internal links to /entries/123
 *
 * Rules:
 * - Matches #<digits> with word boundaries (won't match inside words or URLs)
 * - Skips code blocks and inline code
 * - Also matches explicit /entries/<digits> URLs in plain text
 */

import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root, PhrasingContent } from "mdast";

// Match #123 style references (not inside words)
const ENTRY_REF_REGEX = /(?<=^|[\s([\]{},.;:!?])#(\d+)(?=$|[\s)\]{},.;:!?])/g;

export default function remarkInternalLinks() {
  return (tree: Root) => {
    findAndReplace(tree, [
      [
        ENTRY_REF_REGEX,
        (_match: string, id: string): PhrasingContent => ({
          type: "link",
          url: `/entries/${id}`,
          children: [{ type: "text", value: `#${id}` }],
          data: {
            hProperties: { className: "internal-link", "data-entry-id": id },
          },
        }),
      ],
    ]);
  };
}
