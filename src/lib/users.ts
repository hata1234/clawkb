import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { getEffectiveRole, normalizeRole } from "./roles";

export const userWithGroupInclude = {
  group: true,
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
  role: string;
  approvalStatus: string;
  agent: boolean;
  createdAt: Date;
  updatedAt: Date;
  emailVerifiedAt: Date | null;
  group: { id: number; name: string; role: string } | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: buildDisplayName(user),
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: normalizeRole(user.role),
    group: user.group ? { id: user.group.id, name: user.group.name, role: normalizeRole(user.group.role) } : null,
    effectiveRole: getEffectiveRole(user),
    approvalStatus: user.approvalStatus,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    agent: user.agent,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
