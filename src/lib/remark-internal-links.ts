/**
 * Remark plugin: transform [[entry:ID|title]] patterns into internal links
 *
 * Syntax: [[entry:123|Some Title Here]]
 * Renders as: a clickable pill link to /entries/123 showing the title
 *
 * Skips code blocks and inline code automatically (mdast-util-find-and-replace).
 */

import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root, PhrasingContent } from "mdast";

// Match [[entry:123|Title Text]]
const ENTRY_LINK_REGEX = /\[\[entry:(\d+)\|([^\]]+)\]\]/g;

export default function remarkInternalLinks() {
  return (tree: Root) => {
    findAndReplace(tree, [
      [
        ENTRY_LINK_REGEX,
        (_match: string, id: string, title: string): PhrasingContent => ({
          type: "link",
          url: `/entries/${id}`,
          children: [{ type: "text", value: title }],
          data: {
            hProperties: {
              className: "internal-link",
              "data-entry-id": id,
            },
          },
        }),
      ],
    ]);
  };
}
