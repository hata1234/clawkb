import type { Prisma } from "@prisma/client";
import { buildDisplayName } from "./users";

export const entryWithAuthorInclude = {
  tags: true,
  collections: { select: { id: true, name: true, icon: true, color: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.EntryInclude;

export const commentWithAuthorInclude = {
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.EntryCommentInclude;

type EntryAuthor = {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
} | null;

export function serializeEntry<T extends {
  id: number;
  docNumber?: string | null;
  type: string;
  source: string;
  title: string;
  summary: string | null;
  content: string | null;
  status: string;
  url: string | null;
  metadata: unknown;
  authorId: number | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: { id: number; name: string }[];
  collections?: { id: number; name: string; icon?: string | null; color?: string | null }[];
  images?: {
    id: number;
    url: string;
    key: string;
    filename: string;
    mimeType: string;
    size: number;
    caption: string | null;
    sortOrder: number;
  }[];
  author?: EntryAuthor;
}>(entry: T) {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    tags: entry.tags ?? [],
    collections: entry.collections ?? [],
    images: entry.images ?? [],
    author: entry.author
      ? {
          id: entry.author.id,
          username: entry.author.username,
          displayName: buildDisplayName(entry.author),
          avatarUrl: entry.author.avatarUrl,
        }
      : null,
  };
}

export function serializeComment(comment: {
  id: number;
  entryId: number;
  authorId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author?: EntryAuthor;
}) {
  return {
    id: comment.id,
    entryId: comment.entryId,
    authorId: comment.authorId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: comment.author
      ? {
          id: comment.author.id,
          username: comment.author.username,
          displayName: buildDisplayName(comment.author),
          avatarUrl: comment.author.avatarUrl,
        }
      : null,
  };
}
