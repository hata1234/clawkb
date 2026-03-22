import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { createApiToken, verifyRawApiToken, type ApiTokenType } from "./auth-token";
import { getEffectiveRoleName, normalizeRole, type AppRole } from "./roles";
import { getUserPermissions, hasPermission, type PermissionAction } from "./permissions";

interface UserPermission {
  action: string;
  scope: string;
  scopeId: number | null;
}

export interface AppPrincipal {
  id: number | null;
  username: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: string;           // direct role name (or legacy role string)
  groupRole: string | null; // group's role name
  effectiveRole: AppRole;  // resolved effective role
  approvalStatus: string;
  agent: boolean;
  authMethod: "session" | "token";
  tokenType?: ApiTokenType;
  tokenId?: number;
  permissions: UserPermission[];
}

/** Prisma include for loading user with role chain */
const userWithRoleChainInclude = {
  directRole: { include: { permissions: true } },
  group: { include: { role: { include: { permissions: true } } } },
};

type DbUser = Awaited<ReturnType<typeof findUserById>>;

async function principalFromUser(user: NonNullable<DbUser>, authMethod: "session" | "token", token?: { id: number; tokenType: ApiTokenType }): Promise<AppPrincipal> {
  const permissions = await getUserPermissions(user.id);
  const effectiveRoleName = getEffectiveRoleName(user);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    avatarUrl: user.avatarUrl,
    role: user.directRole?.name?.toLowerCase() ?? normalizeRole(user.role),
    groupRole: user.group?.role?.name?.toLowerCase() ?? null,
    effectiveRole: normalizeRole(effectiveRoleName),
    approvalStatus: user.approvalStatus,
    agent: user.agent,
    authMethod,
    tokenType: token?.tokenType,
    tokenId: token?.id,
    permissions,
  };
}

async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    include: userWithRoleChainInclude,
  });
}

async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: userWithRoleChainInclude,
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await findUserByUsername(credentials.username as string);
        if (!user || user.approvalStatus !== "approved") return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        const effectiveRole = normalizeRole(getEffectiveRoleName(user));

        return {
          id: String(user.id),
          name: user.displayName || user.username,
          username: user.username,
          email: user.email,
          role: effectiveRole,
          effectiveRole,
          avatarUrl: user.avatarUrl,
          agent: user.agent,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.id) return session;

      const user = await findUserById(Number(token.id));
      if (!user) return session;

      const effectiveRole = normalizeRole(getEffectiveRoleName(user));

      session.user.id = String(user.id);
      session.user.username = user.username;
      session.user.name = user.displayName || user.username;
      session.user.email = user.email ?? "";
      session.user.role = effectiveRole;
      session.user.effectiveRole = effectiveRole;
      session.user.avatarUrl = user.avatarUrl;
      session.user.agent = user.agent;
      session.user.approvalStatus = user.approvalStatus;

      return session;
    },
  },
});

export async function getSessionPrincipal(): Promise<AppPrincipal | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await findUserById(Number(session.user.id));
  if (!user || user.approvalStatus !== "approved") return null;
  return await principalFromUser(user, "session");
}

export async function getRequestPrincipal(request: Request): Promise<AppPrincipal | null> {
  const sessionPrincipal = await getSessionPrincipal();
  if (sessionPrincipal) return sessionPrincipal;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = await verifyRawApiToken(authHeader.slice(7));
  if (!token) return null;

  if (token.user_id) {
    const user = await findUserById(token.user_id);
    if (!user || user.approvalStatus !== "approved") return null;
    return await principalFromUser(user, "token", { id: token.id, tokenType: token.token_type });
  }

  // Legacy tokens get full admin permissions
  const adminPermissions: UserPermission[] = [
    { action: "read", scope: "global", scopeId: null },
    { action: "create", scope: "global", scopeId: null },
    { action: "edit", scope: "global", scopeId: null },
    { action: "delete", scope: "global", scopeId: null },
    { action: "manage_settings", scope: "global", scopeId: null },
    { action: "manage_users", scope: "global", scopeId: null },
  ];

  return {
    id: null,
    username: token.name || "legacy-token",
    email: null,
    displayName: token.name || "Legacy Token",
    avatarUrl: null,
    role: "admin",
    groupRole: null,
    effectiveRole: "admin",
    approvalStatus: "approved",
    agent: false,
    authMethod: "token",
    tokenType: "legacy",
    tokenId: token.id,
    permissions: adminPermissions,
  };
}

export async function authenticateApi(request: Request): Promise<boolean> {
  return (await getRequestPrincipal(request)) !== null;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function canManageSettings(principal: AppPrincipal) {
  return hasPermission(principal.permissions, "manage_settings");
}

export function canManageUsers(principal: AppPrincipal) {
  return hasPermission(principal.permissions, "manage_users");
}

export function canCreateEntries(principal: AppPrincipal) {
  return hasPermission(principal.permissions, "create");
}

export function canEditEntry(principal: AppPrincipal, entryAuthorId: number | null) {
  return hasPermission(principal.permissions, "edit", {
    entryAuthorId,
    userId: principal.id,
  });
}

export function canDeleteEntry(principal: AppPrincipal, entryAuthorId: number | null) {
  return hasPermission(principal.permissions, "delete", {
    entryAuthorId,
    userId: principal.id,
  });
}

export function canCreateComment(principal: AppPrincipal, _entryAuthorId: number | null) {
  return hasPermission(principal.permissions, "create");
}

export function canReadEntries(principal: AppPrincipal) {
  return hasPermission(principal.permissions, "read");
}

export async function issueUserToken(userId: number, name: string, tokenType: ApiTokenType = "user") {
  return createApiToken({ userId, name, tokenType });
}
