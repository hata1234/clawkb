import crypto from "crypto";
import { prisma } from "./prisma";

export type ApiTokenType = "legacy" | "user" | "agent";

export interface ApiTokenRecord {
  id: number;
  name: string | null;
  token_prefix: string;
  user_id: number | null;
  token_type: ApiTokenType;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return `clawkb_${crypto.randomBytes(32).toString("hex")}`;
}

export async function createApiToken(input: { name: string; userId?: number | null; tokenType?: ApiTokenType }) {
  const token = generateToken();
  const hash = hashToken(token);
  const prefix = token.slice(0, 12);
  const tokenType = input.tokenType ?? "user";

  const record = await prisma.apiToken.create({
    data: {
      name: input.name,
      tokenHash: hash,
      tokenPrefix: prefix,
      userId: input.userId ?? null,
      tokenType,
    },
  });

  return {
    id: record.id,
    name: record.name,
    token_prefix: record.tokenPrefix,
    user_id: record.userId,
    token_type: record.tokenType as ApiTokenType,
    token, // Only returned once at creation
  };
}

export async function verifyRawApiToken(token: string): Promise<ApiTokenRecord | null> {
  const hash = hashToken(token);

  const record = await prisma.apiToken.updateMany({
    where: { tokenHash: hash, revoked: false },
    data: { lastUsedAt: new Date() },
  });

  if (record.count === 0) return null;

  const found = await prisma.apiToken.findUnique({
    where: { tokenHash: hash },
  });

  if (!found || found.revoked) return null;

  return {
    id: found.id,
    name: found.name,
    token_prefix: found.tokenPrefix,
    user_id: found.userId,
    token_type: found.tokenType as ApiTokenType,
  };
}

export async function verifyApiToken(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return (await verifyRawApiToken(authHeader.slice(7))) !== null;
}
