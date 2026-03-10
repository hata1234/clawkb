import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { createApiToken, verifyRawApiToken, type ApiTokenType } from "./auth-token";
import { getEffectiveRole, type AppRole, normalizeRole } from "./roles";
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
  role: AppRole;
  groupRole: AppRole | null;
  effectiveRole: AppRole;
  approvalStatus: string;
  agent: boolean;
  authMethod: "session" | "token";
  tokenType?: ApiTokenType;
  tokenId?: number;
  permissions: UserPermission[];
}

type DbUser = Awaited<ReturnType<typeof findUserById>>;

async function principalFromUser(user: NonNullable<DbUser>, authMethod: "session" | "token", token?: { id: number; tokenType: ApiTokenType }): Promise<AppPrincipal> {
  const permissions = await getUserPermissions(user.id);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    avatarUrl: user.avatarUrl,
    role: normalizeRole(user.role),
    groupRole: user.group ? normalizeRole(user.group.role) : null,
    effectiveRole: getEffectiveRole(user),
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
    include: { group: true },
  });
}

async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: { group: true },
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

        return {
          id: String(user.id),
          name: user.displayName || user.username,
          username: user.username,
          email: user.email,
          role: normalizeRole(user.role),
          effectiveRole: getEffectiveRole(user),
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

      session.user.id = String(user.id);
      session.user.username = user.username;
      session.user.name = user.displayName || user.username;
      session.user.email = user.email ?? "";
      session.user.role = normalizeRole(user.role);
      session.user.effectiveRole = getEffectiveRole(user);
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
  if (principal.permissions.length > 0) {
    return hasPermission(principal.permissions, "manage_settings");
  }
  return principal.effectiveRole === "admin";
}

export function canManageUsers(principal: AppPrincipal) {
  if (principal.permissions.length > 0) {
    return hasPermission(principal.permissions, "manage_users");
  }
  return principal.effectiveRole === "admin";
}

export function canCreateEntries(principal: AppPrincipal) {
  if (principal.permissions.length > 0) {
    return hasPermission(principal.permissions, "create");
  }
  return principal.effectiveRole === "admin" || principal.effectiveRole === "editor";
}

export function canEditEntry(principal: AppPrincipal, entryAuthorId: number | null) {
  if (principal.permissions.length > 0) {
    return hasPermission(principal.permissions, "edit", {
      entryAuthorId,
      userId: principal.id,
    });
  }
  if (principal.effectiveRole === "admin") return true;
  if (principal.effectiveRole !== "editor") return false;
  return principal.id !== null && principal.id === entryAuthorId;
}

export function canDeleteEntry(principal: AppPrincipal, entryAuthorId: number | null) {
  if (principal.permissions.length > 0) {
    return hasPermission(principal.permissions, "delete", {
      entryAuthorId,
      userId: principal.id,
    });
  }
  return principal.effectiveRole === "admin";
}

export function canCreateComment(principal: AppPrincipal, _entryAuthorId: number | null) {
  if (principal.permissions.length > 0) {
    return hasPermission(principal.permissions, "create");
  }
  return principal.effectiveRole === "admin" || principal.effectiveRole === "editor";
}

export function canReadEntries(principal: AppPrincipal) {
  if (principal.permissions.length > 0) {
    return hasPermission(principal.permissions, "read");
  }
  return true; // All roles can read in old system
}

export async function issueUserToken(userId: number, name: string, tokenType: ApiTokenType = "user") {
  return createApiToken({ userId, name, tokenType });
}
