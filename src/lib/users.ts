import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { getEffectiveRoleName, normalizeRole } from "./roles";

export const userWithGroupInclude = {
  directRole: { include: { permissions: true } },
  group: { include: { role: { include: { permissions: true } } } },
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
  roleId?: number | null;
  approvalStatus: string;
  agent: boolean;
  createdAt: Date;
  updatedAt: Date;
  emailVerifiedAt: Date | null;
  directRole?: { id: number; name: string; permissions?: unknown[] } | null;
  group?: { id: number; name: string; role?: { id: number; name: string } | null; roleId?: number | null } | null;
}) {
  const effectiveRole = normalizeRole(getEffectiveRoleName(user as Parameters<typeof getEffectiveRoleName>[0]));
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: buildDisplayName(user),
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.directRole?.name?.toLowerCase() ?? normalizeRole(user.role),
    roleId: user.roleId ?? null,
    directRole: user.directRole ? { id: user.directRole.id, name: user.directRole.name } : null,
    group: user.group ? {
      id: user.group.id,
      name: user.group.name,
      role: user.group.role ? { id: user.group.role.id, name: user.group.role.name } : null,
    } : null,
    effectiveRole,
    approvalStatus: user.approvalStatus,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    agent: user.agent,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
