import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

export const DB_URL = process.env.DATABASE_URL ?? "postgresql://localhost:5432/clawkb";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: DB_URL });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Raw pg pool for pgvector operations (Prisma doesn't support vector type natively)
const globalForPool = globalThis as unknown as { pgPool: pg.Pool | undefined };
export const pool = globalForPool.pgPool ?? new pg.Pool({ connectionString: DB_URL });
if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool;
