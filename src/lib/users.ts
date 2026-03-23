import crypto from "crypto";
import type { Prisma } from "@prisma/client";

export const userWithGroupInclude = {
  groups: {
    include: {
      group: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UserInclude;

export function buildDisplayName(user: {
  username: string;
  displayName?: string | null;
}) {
  return user.displayName || user.username;
}

export function makeVerificationToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function serializeUser(user: {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isAdmin: boolean;
  approvalStatus: string;
  agent: boolean;
  createdAt: Date;
  updatedAt: Date;
  emailVerifiedAt: Date | null;
  groups?: { group: { id: number; name: string }; groupId: number; userId: number }[];
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: buildDisplayName(user),
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isAdmin: user.isAdmin,
    groups: (user.groups || []).map(ug => ({ id: ug.group.id, name: ug.group.name })),
    approvalStatus: user.approvalStatus,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    agent: user.agent,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
