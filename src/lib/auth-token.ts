import crypto from "crypto";
import { pool } from "./prisma";

// ─── Ensure api_tokens table exists ──────────────────────────────────────
let tableReady = false;

export async function ensureApiTokensTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      token_prefix VARCHAR(8) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked BOOLEAN DEFAULT FALSE
    );
  `);
  tableReady = true;
}

// ─── Token helpers ───────────────────────────────────────────────────────
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return `clawkb_${crypto.randomBytes(32).toString("hex")}`;
}

// ─── Verify bearer token from request ────────────────────────────────────
export async function verifyApiToken(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.substring(7);
  const hash = hashToken(token);

  await ensureApiTokensTable();

  const result = await pool.query(
    `UPDATE api_tokens SET last_used_at = NOW()
     WHERE token_hash = $1 AND revoked = FALSE
     RETURNING id`,
    [hash]
  );

  return result.rowCount !== null && result.rowCount > 0;
}
