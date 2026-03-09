import crypto from "crypto";
import { pool } from "./prisma";

export type ApiTokenType = "legacy" | "user" | "agent";

export interface ApiTokenRecord {
  id: number;
  name: string | null;
  token_prefix: string;
  user_id: number | null;
  token_type: ApiTokenType;
}

let tableReady = false;

export async function ensureApiTokensTable() {
  if (tableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      token_prefix VARCHAR(12) NOT NULL,
      user_id INTEGER,
      token_type VARCHAR(32) NOT NULL DEFAULT 'legacy',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT FALSE
    );
  `);

  await pool.query(`
    ALTER TABLE api_tokens
      ADD COLUMN IF NOT EXISTS user_id INTEGER,
      ADD COLUMN IF NOT EXISTS token_type VARCHAR(32) NOT NULL DEFAULT 'legacy';
  `);

  tableReady = true;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return `clawkb_${crypto.randomBytes(32).toString("hex")}`;
}

export async function createApiToken(input: {
  name: string;
  userId?: number | null;
  tokenType?: ApiTokenType;
}) {
  await ensureApiTokensTable();

  const token = generateToken();
  const hash = hashToken(token);
  const prefix = token.slice(0, 12);
  const tokenType = input.tokenType ?? "user";

  const { rows } = await pool.query<ApiTokenRecord & { created_at: Date }>(
    `INSERT INTO api_tokens (name, token_hash, token_prefix, user_id, token_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, token_prefix, user_id, token_type, created_at`,
    [input.name, hash, prefix, input.userId ?? null, tokenType]
  );

  return {
    ...rows[0],
    token,
  };
}

export async function verifyRawApiToken(token: string): Promise<ApiTokenRecord | null> {
  const hash = hashToken(token);

  await ensureApiTokensTable();

  const result = await pool.query<ApiTokenRecord>(
    `UPDATE api_tokens
     SET last_used_at = NOW()
     WHERE token_hash = $1 AND revoked = FALSE
     RETURNING id, name, token_prefix, user_id, token_type`,
    [hash]
  );

  return result.rows[0] ?? null;
}

export async function verifyApiToken(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return (await verifyRawApiToken(authHeader.slice(7))) !== null;
}
